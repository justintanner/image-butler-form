import _ from "underscore";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import crypto from "crypto";
import moment from "moment";
import PathEncoder from "./PathEncoder";

module.exports = class ImageButlerForm {
  /**
   * Outputs a form or form attributes for uploading a file to S3 with image-butler
   *
   * @param options
   * @param {string} options.imageButlerSecret secret shared with image-butler (IB_SECRET)
   * @param {string} options.awsAccessKeyId AWS access key id for an s3 bucket
   * @param {string} options.awsSecretAccessKey AWS secret access key for an s3 bucket
   * @param {string} options.awsRegion AWS region
   * @param {string} options.s3Bucket Temporary S3 bucket used by image-butler
   * @param {object} options.styles thumbnails to be resized. Example: {thumb: '100x100'}
   * @param {string} options.callbackUrl URL to callback on error or completion
   * @param {object} options.callbackData unmodified data to be returned to the callbackUrl
   * @param {object} options.cropOriginal crop config for the original image
   * @param {object} options.rotateOriginal rotate config for the original image
   */
  constructor(options) {
    this._options = options;

    if (!_.isObject(this._options)) {
      throw new Error("Invalid or no options provided");
    }

    this._validateRequiredOptions();

    this._pathEncoder = new PathEncoder({
      imageButlerSecret: options.imageButlerSecret,
      styles: options.styles,
      callbackUrl: options.callbackUrl,
      callbackData: options.callbackData,
      cropOriginal: options.cropOriginal,
      rotateOriginal: options.rotateOriginal
    });

    const now = moment().utc();
    this._shortExpirationStartDate = now.format("YYYYMMDD");
    this._longExpirationStartDate = now.format("YYYYMMDD[T]HHmmss[Z]");
    this._expirationEndDate = now
      .add(7, "days")
      .format("YYYY-MM-DD[T]HH:mm:ss[Z]");
  }

  form() {
    const templatePath = path.join(
      __dirname,
      "../templates/form.handlebars.html"
    );
    const template = Handlebars.compile(fs.readFileSync(templatePath, "utf8"));

    return template(this.formData());
  }

  formData() {
    return {
      action: `https://${this._options.s3Bucket}.s3.amazonaws.com/`,
      key: this._pathEncoder.pathWithPlaceholders(),
      acl: "public-read",
      "x-amz-algorithm": "AWS4-HMAC-SHA256",
      "x-amz-date": this._longExpirationStartDate,
      "x-amz-expires": 604800, // Max expiration 7 days
      "x-amz-credential": this._credential(),
      policy: this._encodedPolicy(),
      "x-amz-signature": this._signature()
    };
  }

  _credential() {
    const key = this._options.awsAccessKeyId;
    const date = this._shortExpirationStartDate;
    const region = this._options.awsRegion;

    return `${key}/${date}/${region}/s3/aws4_request`;
  }

  _policy() {
    return {
      expiration: this._expirationEndDate,
      conditions: [
        ["starts-with", "$key", "uploads/"],
        { bucket: this._options.s3Bucket },
        { acl: "public-read" },
        { "x-amz-algorithm": "AWS4-HMAC-SHA256" },
        { "x-amz-date": this._longExpirationStartDate },
        { "x-amz-credential": this._credential() }
      ]
    };
  }

  _encodedPolicy() {
    return new Buffer(JSON.stringify(this._policy())).toString("base64");
  }

  _signature() {
    // http://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
    const algorithm = "sha256";

    const dateKey = crypto
      .createHmac(algorithm, `AWS4${this._options.awsSecretAccessKey}`)
      .update(this._shortExpirationStartDate)
      .digest();

    const dateRegionKey = crypto
      .createHmac(algorithm, dateKey)
      .update(this._options.awsRegion)
      .digest();

    const dateRegionServiceKey = crypto
      .createHmac(algorithm, dateRegionKey)
      .update("s3")
      .digest();

    const signingKey = crypto
      .createHmac(algorithm, dateRegionServiceKey)
      .update("aws4_request")
      .digest();

    return crypto
      .createHmac(algorithm, signingKey)
      .update(this._encodedPolicy())
      .digest("hex");
  }

  _validateRequiredOptions() {
    const requireOptions = [
      "imageButlerSecret",
      "awsAccessKeyId",
      "awsSecretAccessKey",
      "awsRegion",
      "s3Bucket"
    ];

    _.each(requireOptions, option => {
      if (!_.has(this._options, option) || !_.isString(this._options[option])) {
        throw new Error(`Invalid or missing option: ${option}`);
      }
    });
  }
};
