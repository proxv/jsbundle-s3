# jsbundle-s3

Bundle, minify, and upload your JS code to Amazon's Simple Storage Service (S3).

## Usage:

    [JSBUNDLE_ENV=env] jsbundle-s3 <node_package_dir> [--bundle-version=version]

The options are basically identical to the [jsbundle options](https://github.com/proxv/jsbundle/blob/master/README.md).

There are two major differences:

  1. the <code>--bundle-version</code> option, which lets you specify a version string for the uploaded bundle. It defaults to a millisecond timestamp.
  2. the "s3" key in <code>jsbundle.json</code>, which is as follows:

    <pre>"s3": {
      "accessKeyId": "my_key_id",
      "secretAccessKey": "my_secret_access_key",
      "bucketName": "my_bucket_name",
      "afterUpload": "redis-cli -p 6379 hmset jsbundle.urls $NAME $URL"
    }</pre>

  <code>afterUpload</code> is optional, and runs a shell command with 3 variables set after S3 upload succeeds:

  * <code>$NAME</code> &mdash; the file name (taken from the bundled package's package.json), e.g.: <code>mypackage.js</code>
  * <code>$VERSION</code> &mdash; the version string, e.g.: <code>1337644600297</code>
  * <code>$URL</code> &mdash; the url, without a protocol, of the uploaded file, e.g.: <code>//s3.amazonaws.com/mybucket/1337644600297/mypackage.js</code>

