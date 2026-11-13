// @effect-diagnostics nodeBuiltinImport:off - Effect has no incremental digest.
import * as NodeCrypto from "node:crypto";
import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Option from "effect/Option";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import { HttpClient, HttpClientRequest } from "effect/http";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";

import * as HostProcess from "@t3tools/shared/HostProcess";

import * as ServerConfig from "../config.ts";
import * as ProcessRunner from "../processRunner.ts";
import { PIPER_VOICE_FILES, piperBinaryFor, type PiperFile } from "./piperAssets.ts";

const PIPER_MAX_TEXT_CHARS = 4_000;

export class PiperError extends Schema.TaggedError<PiperError>()("PiperError", {
  reason: Schema.Literals(["unsupported-platform", "download", "verification", "synthesis"]),
  cause: Schema.optional(Schema.Defect()),
}) {
  override get message(): string {
    return `Piper text-to-speech failed: ${this.reason}.`;
  }
}

const isPiperError = Schema.is(PiperError);

export class PiperSpeech extends Context.Service<
  PiperSpeech,
  {
    /** WAV audio for `text`. The first call downloads Piper and a voice, which takes a while. */
    readonly synthesize: (text: string) => Effect.Effect<Uint8Array, PiperError>;
  }
>()("t3/speech/Piper/PiperSpeech") {}

const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const http = yield* HttpClient.HttpClient;
  const runner = yield* ProcessRunner.ProcessRunner;
  const platform = yield* HostProcess.Platform;
  const arch = yield* HostProcess.Architecture;
  const config = yield* ServerConfig.ServerConfig;
  const directory = path.join(config.stateDir, "speech", "piper");
  const installLock = yield* Semaphore.make(1);
  const synthLock = yield* Semaphore.make(1);

  const fetchVerified = Effect.fn("PiperSpeech.fetchVerified")(function* (file: PiperFile) {
    const target = path.join(directory, file.filename);
    const partial = `${target}.part`;
    const hash = NodeCrypto.createHash("sha256");
    let size = 0;
    const response = yield* http.execute(HttpClientRequest.get(file.url));
    if (response.status !== 200) return yield* new PiperError({ reason: "download" });
    yield* response.stream.pipe(
      Stream.tap((chunk) =>
        Effect.sync(() => {
          hash.update(chunk);
          size += chunk.byteLength;
        }),
      ),
      Stream.run(fs.sink(partial, { mode: 0o600 })),
    );
    if (size !== file.size || hash.digest("hex") !== file.sha256) {
      yield* fs.remove(partial, { force: true });
      return yield* new PiperError({ reason: "verification" });
    }
    yield* fs.rename(partial, target);
    return target;
  });

  // The override pair skips the download, for a Piper or voice the user installed themselves.
  const overrides = {
    binary: Option.getOrUndefined(yield* Config.option(Config.String("T3CODE_PIPER_BIN"))),
    model: Option.getOrUndefined(yield* Config.option(Config.String("T3CODE_PIPER_MODEL"))),
  };

  const ensureInstalled = installLock
    .withPermits(1)(
      Effect.gen(function* () {
        if (overrides.binary && overrides.model)
          return overrides as { binary: string; model: string };
        const asset = piperBinaryFor(platform, arch);
        if (!asset) return yield* new PiperError({ reason: "unsupported-platform" });
        const binary = path.join(directory, asset.executable);
        const model = path.join(directory, PIPER_VOICE_FILES[0]!.filename);
        const done = path.join(directory, "installed");
        if ((yield* fs.exists(done)) && (yield* fs.exists(binary))) return { binary, model };
        yield* fs.makeDirectory(directory, { recursive: true });
        const archive = yield* fetchVerified(asset);
        for (const voice of PIPER_VOICE_FILES) yield* fetchVerified(voice);
        // tar reads .tar.gz everywhere and .zip on Windows 10+.
        yield* runner
          .run({ command: "tar", args: ["-xf", archive, "-C", directory], timeout: "120 seconds" })
          .pipe(Effect.mapError((cause) => new PiperError({ reason: "download", cause })));
        yield* fs.remove(archive, { force: true });
        yield* fs.writeFileString(done, asset.sha256);
        return { binary, model };
      }),
    )
    .pipe(
      Effect.mapError((error) =>
        isPiperError(error) ? error : new PiperError({ reason: "download", cause: error }),
      ),
    );

  return PiperSpeech.of({
    synthesize: Effect.fn("PiperSpeech.synthesize")(
      function* (text) {
        const { binary, model } = yield* ensureInstalled;
        return yield* synthLock.withPermits(1)(
          Effect.scoped(
            Effect.gen(function* () {
              const temp = yield* fs.makeTempDirectoryScoped({ prefix: "t3-piper-" });
              const output = path.join(temp, "out.wav");
              const run = yield* runner.run({
                command: binary,
                args: ["--model", model, "--output_file", output],
                cwd: path.dirname(binary),
                stdin: text.slice(0, PIPER_MAX_TEXT_CHARS),
                timeout: "90 seconds",
              });
              if (run.code !== 0) return yield* new PiperError({ reason: "synthesis" });
              return yield* fs.readFile(output);
            }),
          ),
        );
      },
      Effect.mapError((error) =>
        isPiperError(error) ? error : new PiperError({ reason: "synthesis", cause: error }),
      ),
    ),
  });
});

export const layer = Layer.effect(PiperSpeech, make);
