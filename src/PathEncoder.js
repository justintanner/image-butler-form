import _ from "underscore";
import crypto from "crypto";
import validUrl from "valid-url";

class PathEncoder {
  /**
   * Creates a AWS S3 path with encoded configuration data.
   *
   * @param {object} options
   * @param {string} options.imageButlerSecret secret used to sign configuration (shared with image-butler)
   * @param {object} options.styles thumbnails to be resized. Example: {thumb: '100x100'}
   * @param {string} options.callbackUrl URL to callback on error or completion
   * @param {object} options.callbackData unmodified data to be returned to the callbackUrl
   * @param {object} options.cropOriginal crop config for the original image
   * @param {object} options.rotateOriginal rotate config for the original image
   */
  constructor(options) {
    this._secret = options.imageButlerSecret;
    this._styles = options.styles;
    this._callbackUrl = options.callbackUrl;
    this._callbackData = options.callbackData || {};
    this._cropOriginal = options.cropOriginal;
    this._rotateOriginal = options.rotateOriginal;

    if (!_.isString(this._secret)) {
      throw new Error(`Invalid or missing imageButlerSecret`);
    }

    this._validateStyles();
    this._validateCallback();
    this._validateCropConfig();
    this._validateRotateConfig();
  }

  /**
   * Returns a path with placeholders ready for jQuery.fileUpload
   *
   * @returns {string} a path placeholders
   */
  pathWithPlaceholders() {
    return `uploads/{timestamp}/{unique_id}/${this._base64EncodedConfig()}/{filename}.{extension}`;
  }

  _base64EncodedConfig() {
    return new Buffer(this._jsonConfig()).toString("base64");
  }

  _jsonConfig() {
    const config = {
      version: "1.0",
      timestamp: Date.now(),
      styles: this._styles,
      callbackData: this._callbackData,
      callbackUrl: this._callbackUrl
    };

    if (_.isObject(this._cropOriginal)) {
      config.cropOriginal = this._cropOriginal;
    }

    if (_.isObject(this._rotateOriginal)) {
      config.rotateOriginal = this._rotateOriginal;
    }

    const hmac = crypto.createHmac("sha256", this._secret);
    config.signature = hmac.update(JSON.stringify(config)).digest("hex");

    return JSON.stringify(config);
  }

  _validateStyles() {
    if (_.isObject(this._styles)) {
      _.each(this._styles, (geometry, name) => {
        if (!PathEncoder.validImageMagickGeometry(geometry)) {
          throw new Error(`Invalid geometry in config (${name}: ${geometry})`);
        }
      });
    }
  }

  _validateCallback() {
    if (!validUrl.isUri(this._callbackUrl)) {
      throw new Error("Invalid callbackUrl");
    }
  }

  _validateCropConfig() {
    const cropOriginal = this._cropOriginal;
    if (_.isObject(cropOriginal)) {
      const properties = ["width", "height", "x", "y"];

      _.each(properties, property => {
        if (
          !_.has(cropOriginal, property) ||
          !_.isNumber(cropOriginal[property])
        ) {
          throw new Error("cropOriginal has an invalid or missing width");
        }
      });
    }
  }

  _validateRotateConfig() {
    const rotateOriginal = this._rotateOriginal;

    if (_.isObject(rotateOriginal)) {
      if (
        !_.has(rotateOriginal, "angle") ||
        !_.isNumber(rotateOriginal.angle)
      ) {
        throw new Error("rotateOriginal has an invalid or missing angle");
      }

      if (
        _.has(rotateOriginal, "backgroundColor") &&
        !_.isString(rotateOriginal.backgroundColor)
      ) {
        throw new Error("rotateOriginal has an invalid backgroundColor");
      }
    }
  }

  static validImageMagickGeometry(geometry) {
    return /\d+x\d*[\>\<\#\@\%^!]?/.test(geometry);
  }
}

export default PathEncoder;
