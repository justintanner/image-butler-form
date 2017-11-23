import test from "ava";
import _ from "underscore";
import ImageButlerForm from "../src/ImageButlerForm";

test("creates valid form html to post to s3 directly", async t => {
  const imageButlerForm = new ImageButlerForm({
    imageButlerSecret: "a",
    awsAccessKeyId: "b",
    awsSecretAccessKey: "c",
    awsRegion: "us-west-1",
    s3Bucket: "temporary-upload-bucket",
    callbackUrl: "http://www.jwtanner.com"
  });

  const formHtml = imageButlerForm.form();

  t.true(
    formHtml.includes("https://temporary-upload-bucket.s3.amazonaws.com/")
  );

  // Make sure all handlebar's were replaced.
  t.false(formHtml.includes("{{"));
  t.false(formHtml.includes("}}"));
});

test("creates valid form data to post to s3 directly", async t => {
  const imageButlerForm = new ImageButlerForm({
    imageButlerSecret: "a",
    awsAccessKeyId: "b",
    awsSecretAccessKey: "c",
    awsRegion: "us-west-1",
    s3Bucket: "temporary-upload-bucket",
    callbackUrl: "http://www.jwtanner.com"
  });

  const formData = imageButlerForm.formData();

  t.is(formData.action, "https://temporary-upload-bucket.s3.amazonaws.com/");
  t.regex(
    formData.key,
    /uploads\/{timestamp}\/{unique_id}\/.*\/{filename}.{extension}/
  );
  t.is(formData.acl, "public-read");
  t.is(formData["x-amz-algorithm"], "AWS4-HMAC-SHA256");
  t.true(_.isString(formData["x-amz-credential"]));
  t.true(_.isString(formData["x-amz-date"]));
  t.true(_.isString(formData.policy));
  t.true(_.isString(formData["x-amz-signature"]));
});

test("throw an error when no options are passed in", async t => {
  const error = await t.throws(() => {
    const imageButlerForm = new ImageButlerForm();
  });

  t.is(error.message, "Invalid or no options provided");
});

test("throw an error for a missing required attribute imageButlerSecret", async t => {
  const error = await t.throws(() => {
    const imageButlerForm = new ImageButlerForm({
      awsAccessKeyId: "a",
      awsSecretAccessKey: "b",
      awsRegion: "c",
      s3Bucket: "d"
    });
  });

  t.is(error.message, "Invalid or missing option: imageButlerSecret");
});

test("throw an error for a missing required attribute awsAccessKeyId", async t => {
  const error = await t.throws(() => {
    const imageButlerForm = new ImageButlerForm({
      imageButlerSecret: "a",
      awsSecretAccessKey: "b",
      awsRegion: "c",
      s3Bucket: "d"
    });
  });

  t.is(error.message, "Invalid or missing option: awsAccessKeyId");
});

test("throw an error for a missing required attribute awsSecretAccessKey", async t => {
  const error = await t.throws(() => {
    const imageButlerForm = new ImageButlerForm({
      imageButlerSecret: "a",
      awsAccessKeyId: "b",
      awsRegion: "c",
      s3Bucket: "d"
    });
  });

  t.is(error.message, "Invalid or missing option: awsSecretAccessKey");
});

test("throw an error for a missing required attribute awsRegion", async t => {
  const error = await t.throws(() => {
    const imageButlerForm = new ImageButlerForm({
      imageButlerSecret: "a",
      awsAccessKeyId: "b",
      awsSecretAccessKey: "c",
      s3Bucket: "d"
    });
  });

  t.is(error.message, "Invalid or missing option: awsRegion");
});

test("throw an error for a missing required attribute s3Bucket", async t => {
  const error = await t.throws(() => {
    const imageButlerForm = new ImageButlerForm({
      imageButlerSecret: "a",
      awsAccessKeyId: "b",
      awsSecretAccessKey: "c",
      awsRegion: "d"
    });
  });

  t.is(error.message, "Invalid or missing option: s3Bucket");
});

test("errors from PathEncoder throw from ImageButlerForm as well", async t => {
  const error = await t.throws(() => {
    // The rest of these errors are tested in PatheEncoderTest.js
    const imageButlerForm = new ImageButlerForm({
      imageButlerSecret: "a",
      awsAccessKeyId: "b",
      awsSecretAccessKey: "c",
      awsRegion: "d",
      s3Bucket: "e",
      callbackUrl: "invalid"
    });
  });

  t.is(error.message, "Invalid callbackUrl");
});
