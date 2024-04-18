const { src, dest, watch, series, parallel } = require("gulp");

const srcBase = '../src';
const distBase = '../dist';
const srcPath = {
  css: srcBase + '/sass/**/*.scss',  // 元のSassファイルのパス
  img: srcBase + '/images/**/*',     // 元の画像ファイルのパス
};
const distPath = {
  css: distBase + '/css/',           // 出力先のCSSディレクトリ
  img: distBase + '/images/',        // 出力先の画像ディレクトリ
  html: distBase + '/**/*.html',     // 監視対象のHTMLファイルのパス
  js: distBase + '/js/**/*.js',      // 監視対象のJavaScriptファイルのパス
};

const browserSync = require("browser-sync");
const browserSyncOption = {
  server: distBase,                   // ローカルサーバーのルートディレクトリ
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
    .pipe(dest(distPath.css)) //
    .pipe(notify({ // エラー発生時のアラート出力
      message: 'Sassをコンパイルしてるんやで〜！',
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

const watchFiles = () => {
  watch(srcPath.css, series(cssSass, browserSyncReload));
  watch(srcPath.img, series(imgImagemin, browserSyncReload));
  watch(distPath.html, series(browserSyncReload));
  watch(distPath.js, series(browserSyncReload));
};

const del = require('del');
const delPath = {
  css: distBase + '/css/style.css',      // 削除するCSSファイルのパス
  cssMap: distBase + '/css/style.css.map',  // 削除するCSSのソースマップファイルのパス
  img: distBase + '/images/',             // 削除する画像ディレクトリのパス
};
const clean = (done) => {
  del(delPath.css, { force: true });
  del(delPath.cssMap, { force: true });
  del(delPath.img, { force: true });
  done();
};

exports.default = series(series(clean, imgImagemin, cssSass), parallel(watchFiles, browserSyncFunc));
