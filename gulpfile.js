const gulp = require("gulp");
const zip = require("gulp-zip");
const fs = require("fs");

// Read the module manifest
const manifest = JSON.parse(fs.readFileSync("./module.json", "utf8"));

// Define file paths
const paths = {
  dist: "./dist",
  package: "./package",
};

// Clean the build directory
function clean(cb) {
  // Check if the directory exists
  if (fs.existsSync(paths.dist)) {
    fs.rmSync(paths.dist, { recursive: true, force: true });
  }
  fs.mkdirSync(paths.dist, { recursive: true });

  // Check if the package directory exists
  if (fs.existsSync(paths.package)) {
    fs.rmSync(paths.package, { recursive: true, force: true });
  }
  fs.mkdirSync(paths.package, { recursive: true });

  cb();
}

// Copy module files to the dist directory
function copyFiles() {
  return gulp
    .src(
      [
        "module.json",
        "README.md",
        "scripts/**/*",
        "styles/**/*",
        "languages/**/*",
        "templates/**/*",
      ],
      { base: "./" }
    )
    .pipe(gulp.dest(paths.dist));
}

// Create a zip file for distribution
function createZip() {
  return gulp
    .src(`${paths.dist}/**/*`)
    .pipe(zip(`actions-tab-5e.zip`))
    .pipe(gulp.dest(paths.package));
}

// Watch for changes
function watch() {
  gulp.watch(
    [
      "scripts/**/*",
      "styles/**/*",
      "languages/**/*",
      "templates/**/*",
      "module.json",
    ],
    copyFiles
  );
}

// Define complex tasks
const build = gulp.series(clean, copyFiles, createZip);

// Export tasks
exports.clean = clean;
exports.copy = copyFiles;
exports.zip = createZip;
exports.build = build;
exports.watch = watch;
exports.default = build;
