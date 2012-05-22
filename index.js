var fs = require('fs');
var path = require('path');
var uglifyjs = require('uglify-js');
var jsbundle = require('jsbundle');
var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var S3 = awssum.load('amazon/s3').S3;
var gzip = require('gzip');
var exec = require('child_process').exec;

function createBundle(bundlePath, env, options) {
  var jsbundleConfig = jsbundle.parseConfig(bundlePath, env);
  var s3Config = jsbundleConfig.s3 || jsbundleConfig.S3;
  if (!s3Config) {
    throw new Error('No "s3" key found in ' + path.resolve(bundlePath + '/jsbundle.json for env: "' + env + '"'));
  } else if (!s3Config.bucketName) {
    throw new Error('No bucket name specified in S3 config for env: "' + env + '"');
  }

  var version = options.version || (new Date()).getTime();
  s3Config.version = version;

  var bundleName = _bundleName(bundlePath);
  s3Config.bundleName = bundleName;

  var bundleUrl = '//s3.amazonaws.com/' + s3Config.bucketName + '/' + version + '/' + bundleName;
  s3Config.url = bundleUrl;
  jsbundleConfig.bundleUrl = JSON.stringify(bundleUrl);

  process.stderr.write('Creating bundle' + (options.dryRun ? ' (DRY RUN)' : '') + ': http:' + bundleUrl + ' ... ');

  try {
    process.stderr.write('bundling ... ');
    var bundledCode = _bundle(jsbundleConfig);
    var uglifiedCode = _uglify(bundledCode);
  } catch (e) {
    console.error('Error.');
    throw e;
  }

  process.stderr.write('gzipping ... ');

  gzip(uglifiedCode, function(err, data) {
    if (err) {
      console.error('Error.');
      throw err;
    } else {
      console.error('Done.');
      console.error('Final minified + gzipped file size: ' + Math.round(data.length / 1024) +
                    'kB (' + Math.round((1 - data.length / Buffer.byteLength(bundledCode)) * 100) + '% savings)');

      if (options.dryRun) {
        console.error('This is a dry run, so not uploading to S3.');
      } else {
        _s3upload(data, s3Config, originalSize);
      }
    }
  });
}

function _s3upload(data, s3Config) {
  s3Config.region = s3Config.region || amazon.US_EAST_1
  var s3 = new S3(s3Config);

  var options = {
    BucketName: s3Config.bucketName,
    ObjectName: s3Config.version + '/' + s3Config.bundleName,
    Acl: 'public-read',
    ContentType: 'application/javascript',
    ContentEncoding: 'gzip',
    ContentLength: data.length,
    Body: data,
  };

  process.stderr.write('Uploading to S3 ... ');

  s3.PutObject(options, function(err, data) {
    if (err) {
      throw new Error(JSON.stringify(err.Body.Error));
    } else {
      console.error('Success!');
      if (s3Config.afterUpload) {
        var envVars = 'NAME="' + s3Config.bundleName + '" ' +
                      'URL="' + s3Config.url + '" ' +
                      'VERSION="' + s3Config.version + '"';
        var cmd = envVars + " bash -c '" + s3Config.afterUpload + "'";
        console.error('Executing: ' + cmd);
        exec(cmd, function(err, stdout, stderr) {
          if (stdout) {
            process.stdout.write(stdout);
          }
          if (stderr) {
            process.stderr.write(stderr);
          }
        });
      }
    }
  });
}

function _bundleName(bundlePath) {
  var name;
  try {
    name = JSON.parse(fs.readFileSync(bundlePath + '/package.json')).name;
  } catch (e) {
    var parts = bundlePath.replace(/\/\s*$/, '').split('/');
    name = parts[parts.length - 1];
  }

  if (!/\.js$/.test(name)) {
    name = name + '.js';
  }

  return name;
}

function _bundle(jsbundleConfig) {
  var bundle = new jsbundle.Bundle(jsbundleConfig);
  var code = bundle.compile();
  if (bundle.error) {
    throw bundle.error;
  } else {
    return code;
  }
}

function _uglify(code) {
  var ast = uglifyjs.parser.parse(code);
  process.stderr.write('consolidating property names ... ');
  ast = uglifyjs.consolidator.ast_consolidate(ast);
  process.stderr.write('mangling variable names ... ');
  ast = uglifyjs.uglify.ast_mangle(ast, { mangle: true });
  process.stderr.write('squeezing AST ... ');
  ast = uglifyjs.uglify.ast_squeeze(ast);
  ast = uglifyjs.uglify.ast_squeeze_more(ast);

  return uglifyjs.uglify.gen_code(ast);
}

exports.createBundle = createBundle;

