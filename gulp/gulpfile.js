const { src, dest, watch, series, parallel } = require("gulp");

const srcBase = '../src';
const distBase = '../dist';
const srcPath = {
  css: srcBase + '/sass/**/*.scss',
  img: srcBase + '/images/**/*',
  js: srcBase + '/js/**/*.js', // JavaScriptのソースパス
};
const distPath = {
  css: distBase + '/css/',
  img: distBase + '/images/',
  html: distBase + '/**/*.html',
  js: distBase + '/js/', // JavaScriptの出力パス
};

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
const sass = require('gulp-sass')(require('sass')); // sassコンパイル（DartSass対応）
const sassGlob = require('gulp-sass-glob-use-forward'); // globパターンを使用可にする
const plumber = require("gulp-plumber"); // エラーが発生しても強制終了させない
const notify = require("gulp-notify"); // エラー発生時のアラート出力
const postcss = require("gulp-postcss"); // PostCSS利用
const cssnext = require("postcss-cssnext"); // 最新CSS使用を先取り
const sourcemaps = require("gulp-sourcemaps"); // ソースマップ生成
const cleanCSS = require('gulp-clean-css'); // CSS圧縮
const rename = require('gulp-rename'); // ファイル名変更
const uglify = require('gulp-uglify'); // JavaScript圧縮
const browsers = [ // 対応ブラウザの指定
  'last 2 versions',
  '> 5%',
  'ie = 11',
  'not ie <= 10',
  'ios >= 8',
  'and_chr >= 5',
  'Android >= 5',
]
const cssSass = () => {
  return src(srcPath.css)
    .pipe(sourcemaps.init()) // ソースマップの初期化
    .pipe(
      plumber({ // エラーが出ても処理を止めない
          errorHandler: notify.onError('Error:<%= error.message %>')
      }))
    .pipe(sassGlob()) // globパターンを使用可にする
    .pipe(sass.sync({ // sassコンパイル
      includePaths: ['src/sass'], // 相対パス省略
      outputStyle: 'expanded' // 出力形式をCSSの一般的な記法にする
    }))
    .pipe(postcss([cssnext({
      features: {
        rem: false
      }
    },browsers)])) // 最新CSS使用を先取り
    .pipe(sourcemaps.write('./')) // ソースマップの出力先をcssファイルから見たパスに指定
    .pipe(dest(distPath.css)) // 元のCSSを出力
    .pipe(cleanCSS()) // CSS圧縮
    .pipe(rename({ suffix: '.min' })) // 圧縮されたCSSのファイル名に`.min`を追加
    .pipe(dest(distPath.css)) // 圧縮されたCSSを出力
    .pipe(notify({ // エラー発生時のアラート出力
      message: 'Sassをコンパイルして圧縮てるんやで〜！',
      onLast: true
    }))
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
    .pipe(plumber({ // エラーが出ても処理を止めない
      errorHandler: notify.onError('Error:<%= error.message %>')
    }))
    .pipe(dest(distPath.js)) // 元のJSを出力
    .pipe(uglify()) // JavaScript圧縮
    .pipe(rename({ suffix: '.min' })) // 圧縮されたJSのファイル名に`.min`を追加
    .pipe(dest(distPath.js)) // 圧縮されたJSを出力
    .pipe(notify({ // エラー発生時のアラート出力
      message: 'JavaScriptをコンパイルして圧縮てるんやで〜！',
      onLast: true
    }));
};

const watchFiles = () => {
  watch(srcPath.css, series(cssSass, browserSyncReload));
  watch(srcPath.img, series(imgImagemin, browserSyncReload));
  watch(srcPath.js, series(jsUglify, browserSyncReload)); // JavaScriptの変更を監視
  watch(distPath.html, series(browserSyncReload));
  watch(distPath.js, series(browserSyncReload));
};

const del = require('del');
const delPath = {
  css: distBase + '/css/style.css',
  cssMap: distBase + '/css/style.css.map',
  img: distBase + '/images/'
};

const clean = (done) => {
  del(delPath.css, { force: true });
  del(delPath.cssMap, { force: true });
  del(delPath.img, { force: true });
  done();
};

exports.default = series(series(clean, imgImagemin, cssSass, jsUglify), parallel(watchFiles, browserSyncFunc));