const { src, dest, watch, series, parallel } = require("gulp");

const srcBase = '../src';
const distBase = '../dist';
const srcPath = {
  css: `${srcBase}/sass/**/*.scss`,
  img: srcBase + '/images/**/*',
  js: [`${srcBase}/js/**/*.js`, `!${srcBase}/js/swiper-bundle.min.js`, `!${srcBase}/js/**/swiper-bundle.min.min.js`], // jsのminファイルを除外
  jsUnminified: `${srcBase}/js/swiper-bundle.min.js`
};
const distPath = {
  css: distBase + '/css/',
  img: distBase + '/images/',
  html: distBase + '/**/*.html',
  js: distBase + '/js/',
};

// ローカルサーバー立ち上げ
const browserSync = require("browser-sync");
const browserSyncOption = {
  server: distBase
};
const browserSyncFunc = () => {
  browserSync.init(browserSyncOption);
};
const browserSyncReload = (done) => {
  browserSync.reload();
  done();
};

// Sassコンパイル
const sass = require('gulp-sass')(require('sass'));
const sassGlob = require('gulp-sass-glob-use-forward');
const plumber = require("gulp-plumber");
const notify = require("gulp-notify");
const postcss = require("gulp-postcss");
const cssnext = require("postcss-cssnext");
const sourcemaps = require("gulp-sourcemaps");
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const browsers = [
  'last 2 versions',
  '> 5%',
  'ie = 11',
  'not ie <= 10',
  'ios >= 8',
  'and_chr >= 5',
  'Android >= 5',
];

const cssSass = () => {
  return src(srcPath.css)
    .pipe(sourcemaps.init())
    .pipe(plumber({
      errorHandler: notify.onError('Error:<%= error.message %>')
    }))
    .pipe(sassGlob())
    .pipe(sass.sync({
      includePaths: ['src/sass'],
      outputStyle: 'expanded'
    }))
    .pipe(postcss([cssnext({
      features: {
        rem: false
      }
    }, browsers)]))
    .pipe(sourcemaps.write('./'))
    .pipe(dest(distPath.css))
    .pipe(cleanCSS())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(distPath.css))
    .pipe(notify({
      message: 'Sassをコンパイルして圧縮してるんやで〜！',
      onLast: true
    }));
}

const imagemin = require("gulp-imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const imageminSvgo = require("imagemin-svgo");
const webp = require('gulp-webp');

const imgImagemin = () => {
  return src(srcPath.img)
    .pipe(imagemin([
      imageminMozjpeg({
        quality: 80
      }),
      imageminPngquant(),
      imageminSvgo({
        plugins: [{
          removeViewbox: false
        }]
      })
    ], {
      verbose: true
    }))
    .pipe(dest(distPath.img))
    .pipe(webp())
    .pipe(dest(distPath.img));
};

const jsUglify = () => {
  return src(srcPath.js)
    .pipe(plumber({
      errorHandler: notify.onError('Error:<%= error.message %>')
    }))
    .pipe(dest(distPath.js))
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(distPath.js))
    .pipe(notify({
      message: 'JavaScriptをコンパイルして圧縮してるんやで〜！',
      onLast: true
    }));
};

// JavaScriptそのまま出力
const jsCopy = (done) => {
  src(srcPath.jsUnminified, { allowEmpty: true })
    .pipe(plumber({
      errorHandler: notify.onError('Error:<%= error.message %>')
    }))
    .pipe(dest(distPath.js))
    .pipe(notify({
      message: 'swiper-bundle.min.jsをコピーしたで〜！',
      onLast: true
    }));
  done();
};

// ファイルの変更を検知
const watchFiles = () => {
  watch(srcPath.css, series(cssSass, browserSyncReload));
  watch(srcPath.img, series(imgImagemin, browserSyncReload));
  watch(srcPath.js, series(jsUglify, browserSyncReload));
  watch(srcPath.jsUnminified, series(jsCopy, browserSyncReload));
  watch(distPath.html, series(browserSyncReload));
};

const del = require('del');
const delPath = {
  css: [`${distBase}/css/**/*.css`, `!${distBase}/css/swiper-bundle.min.css`],
  cssMap: `${distBase}/css/**/*.css.map`,
  img: `${distBase}/images/**/*`,
  js: [`${distBase}/js/**/*.js`, `!${distBase}/js/swiper-bundle.min.js`, `!${distBase}/js/swiper-bundle.min.min.js`], // swiper-bundle.min.min.jsを除外
};

const clean = (done) => {
  del([...delPath.css, delPath.cssMap, delPath.img, ...delPath.js], { force: true });
  done();
};

exports.default = series(clean, imgImagemin, cssSass, jsUglify, jsCopy, parallel(watchFiles, browserSyncFunc));
