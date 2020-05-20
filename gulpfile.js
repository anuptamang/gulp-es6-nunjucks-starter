const { src, dest, watch, series, parallel } = require('gulp')
const sass = require('gulp-sass')
const sourcemaps = require('gulp-sourcemaps')
const browserSync = require('browser-sync').create()
const dirSync = require('gulp-directory-sync')
const csso = require('gulp-csso')
const imagemin = require('gulp-imagemin')
const plumber = require('gulp-plumber')
const beautify = require('gulp-beautify')
const uglify = require('gulp-uglify')
const fs = require('fs')
const pngquant = require('imagemin-pngquant')
const nunjucksRender = require('gulp-nunjucks-render')
const data = require('gulp-data')
const stripCssComments = require('gulp-strip-css-comments')
const gcmq = require('gulp-group-css-media-queries')
const webpack = require('webpack')
const webpackStream = require('webpack-stream')
const eslint = require('gulp-eslint')
const gulpStylelint = require('gulp-stylelint')
const postcss = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const path = require('path')
const reload = browserSync.reload

/**
 * Project paths
 */
const assetsDir = 'src/'
const outputDir = 'dist/'

function minify (condition) {
  if (condition) {
    return csso()
  }
  return beautify.css({ indent_size: 2 })
}

/**
 * Render nunjucks to html
 */
async function html (done) {
  src(assetsDir + 'views/*.+(html|nunjucks)')
    .pipe(plumber())
    .pipe(
      data(function () {
        return JSON.parse(fs.readFileSync('./data.json'))
      })
    )
    .pipe(
      nunjucksRender({
        path: [assetsDir + 'views/template/']
      })
    )
    .pipe(beautify.html({ indent_size: 2 }))
    .pipe(dest(outputDir))
    .pipe(
      reload({
        stream: true
      })
    )
  done()
}

async function removeDist (dirPath) {
  if (!fs.existsSync(dirPath)) {
    return
  }
  var list = fs.readdirSync(dirPath)
  for (var i = 0; i < list.length; i++) {
    var filename = path.join(dirPath, list[i])
    var stat = fs.statSync(filename)

    if (filename === '.' || filename === '..') {
      // do nothing for current and parent dir
    } else if (stat.isDirectory()) {
      removeDist(filename)
    } else {
      fs.unlinkSync(filename)
    }
  }

  fs.rmdirSync(dirPath)
}
/**
 * Watch SCSS and compile to css
 */
async function sassTask (done) {
  src([assetsDir + 'styles/*.scss', '!' + assetsDir + 'styles/_*.scss'])
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        includePaths: ['node_modules']
      })
    )
    .pipe(sourcemaps.write('.'))
    .pipe(dest(outputDir + 'styles/'))
    .pipe(
      reload({
        stream: true
      })
    )
  done()
}

/**
 * Auto sync images from src to dist
 */
async function imageSync () {
  return src(assetsDir + 'images/')
    .pipe(plumber())
    .pipe(
      dirSync(assetsDir + 'images/', outputDir + 'images/', {
        printSummary: true
      })
    )
    .pipe(browserSync.stream())
}
/**
 * Auto sync media files
 */
async function mediaSync () {
  return src(assetsDir + 'media/')
    .pipe(plumber())
    .pipe(
      dirSync(assetsDir + 'media/', outputDir + 'media/', {
        printSummary: true
      })
    )
    .pipe(browserSync.stream())
}
/**
 * Replace media
 */
async function mediaReplace () {
  return src(assetsDir + 'media/**/*')
    .pipe(plumber())
    .pipe(dest(outputDir + 'media/'))
}
/**
 * Auto sync fonts from src to dist
 */
async function fontsSync () {
  return src(assetsDir + 'fonts/')
    .pipe(plumber())
    .pipe(
      dirSync(assetsDir + 'fonts/', outputDir + 'fonts/', {
        printSummary: true
      })
    )
    .pipe(browserSync.stream())
}
async function createFolders () {
  const folders = ['images', 'fonts', 'media']

  return folders.map(folder => {
    if (!fs.existsSync(assetsDir + folder)) fs.mkdirSync(assetsDir + folder)
  })
}
/**
 * Eslint for dev
 */
async function eslintDev () {
  return src(assetsDir + 'js/**/*.js')
    .pipe(plumber())
    .pipe(eslint())
    .pipe(eslint.format())
}
/**
 * Eslint task on build
 */
async function eslintProd () {
  return src(assetsDir + 'js/**/*.js')
    .pipe(plumber())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
}
/**
 * Stylelint SCSS files
 */
async function stylelint () {
  return src('src/**/*.scss')
    .pipe(plumber())
    .pipe(
      gulpStylelint({
        fix: true,
        reporters: [
          {
            formatter: 'string',
            console: true
          }
        ]
      })
    )
}

/**
 * JS task
 */
async function jsSync () {
  return src(`${assetsDir}js/common.js`)
    .pipe(
      webpackStream({
        output: {
          filename: 'common.js'
        },
        mode: 'development',
        module: {
          rules: [
            {
              test: /\.(js)$/,
              exclude: /(node_modules)/,
              loader: 'babel-loader',
              query: {
                presets: ['@babel/env']
              }
            }
          ]
        },
        externals: {
          jquery: 'jQuery'
        }
      })
    )
    .pipe(plumber())
    .pipe(dest(outputDir + 'js/'))
    .pipe(browserSync.stream())
}
async function jsBuild () {
  return src(`${assetsDir}js/common.js`)
    .pipe(
      webpackStream({
        output: {
          filename: 'common.js'
        },
        mode: 'production',
        module: {
          rules: [
            {
              test: /\.(js)$/,
              exclude: /(node_modules)/,
              loader: 'babel-loader',
              query: {
                presets: ['@babel/env']
              }
            }
          ]
        },
        externals: {
          jquery: 'jQuery'
        }
      })
    )
    .pipe(plumber())
    .pipe(uglify())
    .pipe(dest(outputDir + 'js/'))
}
async function jqueryInsert () {
  return src('node_modules/jquery/dist/jquery.js')
    .pipe(uglify())
    .pipe(dest(outputDir + 'js/'))
}
/**
 * Watch files
 */
async function watchTask () {
  const htmlWatcher = watch(
    assetsDir + 'views/**/*.html',
    series(html, browserSyncReload)
  )
  htmlWatcher.on('unlink', function (filepath) {
    const fileName = path.basename(path.resolve(filepath))
    const destFilePath = path.resolve(outputDir, fileName)

    try {
      if (fs.existsSync(destFilePath)) {
        fs.unlinkSync(destFilePath)
      }
    } catch (e) {
      console.log(e)
    }
  })

  watch(assetsDir + 'styles/**/*.scss', series(stylelint, sassTask))
  watch(assetsDir + 'js/**/*.js', series(eslintDev, jsSync))
  watch(assetsDir + 'images/**/*', imageSync)
  watch(assetsDir + 'fonts/**/*', fontsSync)
  watch(assetsDir + 'media/**/*', mediaSync)
}

/**
 * Live reload
 */
async function browserSyncTask (done) {
  browserSync.init({
    port: 4000,
    server: {
      baseDir: outputDir,
      directory: true
    }
  })
  done()
}
/**
 * Reload BrowserSync
 */
async function browserSyncReload (done) {
  browserSync.reload()
  done()
}

/**
 * Optimize and build images
 */
async function imgBuild () {
  return src(assetsDir + 'images/**/*')
    .pipe(
      imagemin([
        imagemin.gifsicle({ interlaced: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo({
          plugins: [
            { removeViewBox: false },
            { cleanupIDs: false }
          ]
        })
      ])
    )
    .pipe(dest(outputDir + 'images/'))
}
async function imgBuildQA () {
  return src(assetsDir + 'images/**/*').pipe(dest(outputDir + 'images/'))
}
/**
 * Dest fonts
 */
async function fontsBuild () {
  return src(assetsDir + 'fonts/**/*').pipe(dest(outputDir + 'fonts/'))
}

/**
 * Build HTML
 */
async function htmlBuild () {
  return src(assetsDir + 'views/*.+(html|nunjucks)')
    .pipe(
      data(function () {
        return JSON.parse(fs.readFileSync('./data.json'))
      })
    )
    .pipe(
      nunjucksRender({
        path: [assetsDir + 'views/template/']
      })
    )
    .pipe(beautify.html({ indent_size: 2 }))
    .pipe(dest(outputDir))
}

/**
 * Minify and build styles
 */
async function cssBuild () {
  return src([assetsDir + 'styles/*.scss', '!' + assetsDir + 'styles/_*.scss'])
    .pipe(plumber())
    .pipe(
      sass({
        includePaths: ['node_modules']
      })
    )
    .pipe(stripCssComments())
    .pipe(postcss([autoprefixer(['last 15 versions'])]))
    .pipe(gcmq())
    .pipe(minify(false))
    .pipe(dest(outputDir + 'styles/'))
}

/**
 * Default watch task
 */
exports.default = series(
  series(
    createFolders,
    html,
    stylelint,
    sassTask,
    imageSync,
    fontsBuild,
    eslintDev,
    jsSync,
    jqueryInsert,
    mediaSync
  ),
  parallel(watchTask, browserSyncTask)
)

/**
 * Build Task
 */
exports.build = series(
  removeDist.bind(this, outputDir),
  imgBuild,
  fontsBuild,
  htmlBuild,
  eslintProd,
  jsBuild,
  jqueryInsert,
  stylelint,
  cssBuild,
  mediaReplace
)
exports.qa = series(
  removeDist.bind(this, outputDir),
  imgBuildQA,
  fontsBuild,
  htmlBuild,
  eslintProd,
  jsBuild,
  jqueryInsert,
  stylelint,
  cssBuild,
  mediaReplace
)
