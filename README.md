# jsbundle-s3

Bundle, minify, and upload your JS code to Amazon's Simple Storage Service (S3).

## Usage:

    [JSBUNDLE_ENV=env] jsbundle-s3 <node_package_dir> [--dry-run]

The options are basically identical to the [jsbundle options](https://github.com/proxv/jsbundle/blob/master/README.md).

There are two major differences to the jsbundle options:

  1. the <code>--dry-run</code> option, which will run everything *except* the actual S3 upload.
  2. the "s3" key in <code>jsbundle.json</code>, which is as follows:

    <pre>"s3": {
      "accessKeyId": "my_access_key_id",
      "secretAccessKey": "my_secret_access_key",
      "bucketName": "my_bucket",
      "afterUpload": "redis-cli hmset jsbundle.urls $NAME $URL"
    }</pre>

  <code>afterUpload</code> is optional, and runs a shell command with 3 variables set after S3 upload succeeds:

  * <code>$NAME</code> &mdash; the file name (taken from the bundled package's package.json or directory name), e.g.: <code>mypackage.js</code>
  * <code>$VERSION</code> &mdash; the sha1 version string, e.g.: <code>7f2da1cf914bd863068224aa1c10e2ba3a4bd0b0</code>
  * <code>$URL</code> &mdash; the url, without a protocol, of the uploaded file, e.g.: <code>//s3.amazonaws.com/my_bucket/7f2da1cf914bd863068224aa1c10e2ba3a4bd0b0/mypackage.js</code>

