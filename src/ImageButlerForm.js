import _ from "underscore";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import PathEncoder from "./PathEncoder";
import s3BrowserDirectUpload from "s3-browser-direct-upload";

class ImageButlerForm {
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
  }

  form() {
    const templatePath = path.join(__dirname, "form.handlebars.html");
    const template = Handlebars.compile(fs.readFileSync(templatePath, "utf8"));

    return template(this.formData());
  }

  formData() {
    const s3clientOptions = {
      accessKeyId: this._options.awsAccessKeyId,
      secretAccessKey: this._options.awsSecretAccessKey,
      region: this._options.awsRegion
    };

    const allowedTypes = ["jpg", "png"];

    const s3client = new s3BrowserDirectUpload(s3clientOptions, allowedTypes);

    const formOptions = {
      key: this._pathEncoder.pathWithPlaceholders(),
      bucket: this._options.s3Bucket,
      region: this._options.awsRegion
    };

    return s3client.uploadPostForm(formOptions, (error, data) => {
      if (error) {
        throw error;
      }

      //console.log(JSON.stringify(data));

      return _.extend({ action: data.form_url }, data.params);
    });
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
}

export default ImageButlerForm;
