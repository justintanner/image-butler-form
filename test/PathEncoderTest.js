import test from "ava";
import crypto from "crypto";
import PathEncoder from "../src/PathEncoder.js";

test("generates a path with jQuery.fileupload placeholders and a valid signature", t => {
  const pathEncoder = new PathEncoder({
    imageButlerSecret: "secret",
    styles: { thumb: "100x100", bigThumb: "200x200" },
    callbackUrl: "http://www.jwtanner.com",
    callbackData: { song: "the cat came back" }
  });

  const path = pathEncoder.pathWithPlaceholders();

  t.regex(
    path,
    /uploads\/{timestamp}\/{unique_id}\/.*\/{filename}.{extension}/
  );

  const encodedConfig = path.split("/")[3];
  const config = JSON.parse(
    new Buffer(encodedConfig, "base64").toString("utf-8")
  );

  t.is(config.callbackData.song, "the cat came back");

  const signature = config.signature;

  delete config.signature;

  const hmac = crypto.createHmac("sha256", "secret");
  const regeneratedSignature = hmac
    .update(JSON.stringify(config))
    .digest("hex");

  t.is(signature, regeneratedSignature);
});

test("throw an error for a missing secret", async t => {
  const error = await t.throws(() => {
    const pathEncoder = new PathEncoder({});
  });

  t.is(error.message, "Invalid or missing imageButlerSecret");
});

test("throw an error when given an invalid geometry", async t => {
  const error = await t.throws(() => {
    const pathEncoder = new PathEncoder({
      imageButlerSecret: "abc",
      styles: { thumb: "invalid" }
    });
  });

  t.is(error.message, "Invalid geometry in config (thumb: invalid)");
});

test("throw an error when given an invalid callbackUrl", async t => {
  const error = await t.throws(() => {
    const pathEncoder = new PathEncoder({
      imageButlerSecret: "abc",
      styles: { thumb: "100x100" },
      callbackUrl: "invalid"
    });

    t.is(error.message, "Invalid callbackUrl");
  });
});

test("accepts a valid crop configuration", t => {
  const cropOriginal = { width: 100, height: 200, x: 0, y: 0 };

  const pathEncoder = new PathEncoder({
    imageButlerSecret: "abc",
    styles: { thumb: "100x100", bigThumb: "200x200" },
    callbackUrl: "http://www.jwtanner.com",
    callbackData: { something: "to send back" },
    cropOriginal: cropOriginal
  });

  const encodedConfig = pathEncoder.pathWithPlaceholders().split("/")[3];
  const config = JSON.parse(
    new Buffer(encodedConfig, "base64").toString("utf-8")
  );

  t.deepEqual(config.cropOriginal, cropOriginal);
});

test("rejects invalid crop config", t => {
  t.throws(() => {
    const pathEncoder = new PathEncoder({
      imageButlerSecret: "abc",
      styles: { thumb: "100x100", bigThumb: "200x200" },
      callbackUrl: "http://www.jwtanner.com",
      callbackData: { something: "to send back" },
      cropOriginal: { width: "bad", height: 200, x: 0, y: 0 }
    });
  });
});

test("accepts a valid rotate config", t => {
  const rotateOriginal = { angle: 90 };

  const pathEncoder = new PathEncoder({
    imageButlerSecret: "abc",
    styles: { thumb: "100x100", bigThumb: "200x200" },
    callbackUrl: "http://www.jwtanner.com",
    callbackData: { something: "to send back" },
    rotateOriginal: rotateOriginal
  });

  const encodedConfig = pathEncoder.pathWithPlaceholders().split("/")[3];
  const config = JSON.parse(
    new Buffer(encodedConfig, "base64").toString("utf-8")
  );

  t.deepEqual(config.rotateOriginal, rotateOriginal);
});

test("rejects invalid crop angle", t => {
  t.throws(() => {
    const pathEncoder = new PathEncoder({
      imageButlerSecret: "abc",
      styles: { thumb: "100x100", bigThumb: "200x200" },
      callbackUrl: "http://www.jwtanner.com",
      callbackData: { something: "to send back" },
      rotateOriginal: { angle: "bad" }
    });
  });
});

test("rejects invalid crop backgroundColor", t => {
  t.throws(() => {
    const pathEncoder = new PathEncoder({
      imageButlerSecret: "abc",
      styles: { thumb: "100x100", bigThumb: "200x200" },
      callbackUrl: "http://www.jwtanner.com",
      callbackData: { something: "to send back" },
      rotateOriginal: { angle: 45, backgroundColor: 4 }
    });
  });
});
