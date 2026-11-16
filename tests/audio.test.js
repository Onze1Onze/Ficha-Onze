import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { WEAPON_AUDIO } from "../src/sound.js";

const audioDirectory = resolve(process.cwd(), "assets/audio/weapons");

test("cada uma das oito armas tem um som de disparo e outro de recarga", () => {
  assert.deepEqual(Object.keys(WEAPON_AUDIO), [
    "pistol", "revolver", "machinegun", "assault-rifle",
    "shotgun", "smg", "sniper", "hunting-rifle",
  ]);

  const allFiles = Object.values(WEAPON_AUDIO).flatMap(({ fire, reload }) => [fire, reload]);
  assert.equal(allFiles.length, 16);
  assert.equal(new Set(allFiles).size, 16, "Cada evento deve ter seu próprio arquivo");
  for (const pair of Object.values(WEAPON_AUDIO)) {
    assert.ok(pair.fire && pair.reload);
    assert.notEqual(pair.fire, pair.reload);
  }
});

test("todos os 16 arquivos locais existem e têm cabeçalhos de áudio válidos", async () => {
  const expectedFiles = Object.values(WEAPON_AUDIO).flatMap(({ fire, reload }) => [fire, reload]).sort();
  const actualFiles = (await readdir(audioDirectory)).sort();
  assert.deepEqual(actualFiles, expectedFiles, "A pasta deve conter somente os 16 arquivos mapeados");

  for (const filename of expectedFiles) {
    const path = resolve(audioDirectory, filename);
    const info = await stat(path);
    const bytes = await readFile(path);
    assert.ok(info.isFile(), `${filename}: não é arquivo`);
    assert.ok(info.size > 1024, `${filename}: arquivo vazio ou truncado`);

    if (filename.endsWith(".wav")) {
      assert.equal(bytes.toString("ascii", 0, 4), "RIFF", `${filename}: cabeçalho WAV inválido`);
      assert.equal(bytes.toString("ascii", 8, 12), "WAVE", `${filename}: assinatura WAVE ausente`);
    } else if (filename.endsWith(".ogg")) {
      assert.equal(bytes.toString("ascii", 0, 4), "OggS", `${filename}: contêiner Ogg inválido`);
    } else if (filename.endsWith(".mp3")) {
      const hasId3 = bytes.toString("ascii", 0, 3) === "ID3";
      const hasFrameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
      assert.ok(hasId3 || hasFrameSync, `${filename}: cabeçalho MP3 inválido`);
    }
  }
});

test("todos os caminhos de áudio são locais ao projeto", async () => {
  for (const sounds of Object.values(WEAPON_AUDIO)) {
    for (const filename of [sounds.fire, sounds.reload]) {
      assert.equal(filename.includes("://"), false);
      assert.equal(filename.startsWith("/"), false);
      assert.equal(filename.includes(".."), false);
      await readFile(resolve(audioDirectory, filename));
    }
  }
});


test("pistola mantém WAV e revólver usa o MP3 anexado do Pixabay", () => {
  assert.equal(WEAPON_AUDIO.pistol.fire, "pistol-fire.wav");
  assert.equal(WEAPON_AUDIO.revolver.fire, "revolver-fire.mp3");
  assert.equal(WEAPON_AUDIO.revolver.reload, "revolver-reload.wav");
});
