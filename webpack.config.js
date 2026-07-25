const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const fs = require('fs');

// Load environment variables (optional)
try {
  require('dotenv').config();
} catch (error) {
  // dotenv is optional, continue without it
  console.log('dotenv not available, using system environment variables only');
}

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// Export a function that receives the env and argv from webpack CLI
module.exports = (env, argv) => {
  // Determine build mode from webpack's --mode flag (not from environment)
  const isDevelopment = argv.mode === 'development';
  const isProduction = argv.mode === 'production';
  
  // Determine if we're building for GitHub Pages
  const isGitHubPages = process.env.GITHUB_PAGES === 'true';

  // Determine if we're building for Electron (native desktop)
  const isElectron = process.env.BUILD_TARGET === 'electron';

  // Determine if we're building for Capacitor (native Android/iOS WebView)
  const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

  // Electron, Capacitor, and local builds need relative paths (file:// and the
  // native WebView can't resolve absolute /). GitHub Pages needs the repo
  // prefix; regular web deploys use root /
  const publicPath = isGitHubPages
    ? '/Alter-Ego-PWA/'
    : isElectron || isCapacitor
      ? './'
      : '/';

// Performance metrics log directory
const METRICS_DIR = path.resolve(__dirname, 'performance-metrics');
// Database metrics log directory
const DB_METRICS_DIR = path.resolve(__dirname, 'db-metrics');

// Create directories if they don't exist
if (!fs.existsSync(METRICS_DIR)) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
}
if (!fs.existsSync(DB_METRICS_DIR)) {
  fs.mkdirSync(DB_METRICS_DIR, { recursive: true });
}

// Plugin to save performance metrics to file
class PerformanceMetricsPlugin {
  constructor(options) {
    this.options = options || {};
  }

  apply(compiler) {
    // Only run in development mode
    if (compiler.options.mode !== 'development') return;

    compiler.hooks.done.tap('PerformanceMetricsPlugin', () => {
      console.log('Performance metrics collection enabled. Reports will be saved to:', METRICS_DIR);
      console.log('Database metrics collection enabled. Reports will be saved to:', DB_METRICS_DIR);
    });    // Add middleware to receive and save metrics
    if (compiler.options.devServer) {
      // Ensure the setupMiddlewares function is called
      const originalSetupMiddlewares = compiler.options.devServer.setupMiddlewares || ((middlewares) => middlewares);
      
      compiler.options.devServer.setupMiddlewares = (middlewares, devServer) => {
        // Call original setupMiddlewares function
        middlewares = originalSetupMiddlewares(middlewares, devServer);
        
        // Add middleware to handle performance metrics
        const app = devServer.app;
        if (app) {
          const bodyParser = require('body-parser');
          app.use(bodyParser.json({ limit: '10mb' }));
          
          app.post('/save-performance-metrics', (req, res) => {
            try {
              const metrics = req.body;
              const filename = `perf-${Date.now()}.json`;
              fs.writeFileSync(
                path.join(METRICS_DIR, filename),
                JSON.stringify(metrics, null, 2)
              );
              res.json({ success: true, filename });
            } catch (error) {
              console.error('Error saving metrics:', error);
              res.status(500).json({ error: error.message });
            }
          });
          
          // Add endpoint for saving database exports
          app.post('/save-db-metrics', (req, res) => {
            try {
              const dbContent = req.body;
              const filename = `db-${Date.now()}.json`;
              fs.writeFileSync(
                path.join(DB_METRICS_DIR, filename),
                JSON.stringify(dbContent, null, 2)
              );
              res.json({ success: true, filename });
            } catch (error) {
              console.error('Error saving database metrics:', error);
              res.status(500).json({ error: error.message });
            }
          });
        }
        
        return middlewares;
      };
    }
  }
}

return {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/js/[name].[contenthash:8].js',
    chunkFilename: 'assets/js/[name].[contenthash:8].chunk.js',
    publicPath: publicPath,
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },  performance: {
    hints: isDevelopment ? false : 'warning',
    maxEntrypointSize: 1024000, // 1 MB
    maxAssetSize: 1024000, // 1 MB
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    },
    cacheDirectory: path.resolve(__dirname, '.webpack_cache'),
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',            options: {
              transpileOnly: true,
              experimentalWatchApi: true,
              happyPackMode: true,
              compilerOptions: {
                sourceMap: isDevelopment
              }
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  optimization: {
    // Avoid double-defining NODE_ENV: we'll define it explicitly below
    nodeEnv: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
    runtimeChunk: 'single',
  },
  plugins: [
  new HtmlWebpackPlugin({
      // Use the root index.html instead of the one in public
      template: './index.html',
      filename: 'index.html',
      inject: true,
      // Inject a production-only CSP meta for stronger security without breaking dev tooling.
      // Electron keeps no meta CSP: file:// does not work with a strict 'self'
      // and the main process already controls what the renderer can load.
      ...(isDevelopment || isElectron
        ? {}
        : {
            meta: {
              'Content-Security-Policy': {
                'http-equiv': 'Content-Security-Policy',
                // Note: frame-ancestors is ignored in meta; enforced via HTTP headers on Vercel.
                //
                // connect-src is the load-bearing directive here. The app holds
                // provider API keys in local storage, so the policy names every
                // host it may talk to and nothing else -- that is what keeps a
                // hypothetical injection from posting those keys somewhere.
                // `ws: wss:` used to be in this list and has been removed: no
                // renderer code opens a WebSocket (LAN peer chat runs over
                // Electron IPC in the main process), so it only widened the
                // exfiltration surface.
                //
                // The Capacitor APK gets the same policy minus the localhost
                // model servers, which a phone cannot reach anyway, plus the
                // scheme Capacitor serves the bundle from.
                // The Capacitor build additionally reaches GitHub to check for
                // releases and download the updated APK. objects.githubusercontent.com
                // is where release asset downloads redirect to.
                content: isCapacitor
                  ? "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://localhost capacitor://localhost https://api.openai.com https://api.anthropic.com https://api.elevenlabs.io https://openrouter.ai https://api.github.com https://github.com https://objects.githubusercontent.com; media-src 'self' blob: data:; worker-src 'self'; manifest-src 'self'"
                  : "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.elevenlabs.io https://openrouter.ai http://127.0.0.1:8000 http://127.0.0.1:11434 http://localhost:11434; media-src 'self' blob: data:; worker-src 'self'; manifest-src 'self'",
              },
            },
          }),
    }),
    new ForkTsCheckerWebpackPlugin({
      async: true,
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'public/assets', 
          to: 'assets' 
        },
        {
          from: 'manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'service-worker.js',
          to: 'service-worker.js',
          transform(content) {
            // Inject version from package.json into service worker
            const packageJson = require('./package.json');
            return content
              .toString()
              .replace('const CACHE_VERSION = \'1.0.1\';', 
                      `const CACHE_VERSION = '${packageJson.version}';`);
          }
        },
      ],
    }),
    // Define only the vars we need without clobbering process.env entirely
    new webpack.DefinePlugin({
      // Set NODE_ENV based on the build mode (from --mode flag)
      'process.env.NODE_ENV': JSON.stringify(isDevelopment ? 'development' : 'production'),
      // Single source of truth for the running version. The update check
      // compares this against the latest GitHub release, and Android derives
      // its versionName/versionCode from the same field in package.json.
      'process.env.APP_VERSION': JSON.stringify(require('./package.json').version),
      // Lets the renderer tell which shell it was built for without sniffing.
      'process.env.BUILD_TARGET': JSON.stringify(
        isElectron ? 'electron' : isCapacitor ? 'capacitor' : 'web'
      ),
      'process.env.PUBLIC_URL': JSON.stringify(publicPath.slice(0, -1)),
      'process.env.REACT_APP_IMMERSIVE_MODE': JSON.stringify(process.env.REACT_APP_IMMERSIVE_MODE || 'false'),
      'process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING': JSON.stringify(process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING || 'false'),
      'process.env.REACT_APP_LOG_LEVEL': JSON.stringify(process.env.REACT_APP_LOG_LEVEL || 'info'),
      'process.env.REACT_APP_SECURITY_CONFIG': JSON.stringify(process.env.REACT_APP_SECURITY_CONFIG || ''),
      // Add build-time flag for service worker and other places that need compile-time mode detection
      '__IS_DEV__': JSON.stringify(isDevelopment),
    }),
    new PerformanceMetricsPlugin(),
    // Add bundle analyzer only when explicitly requested
    ...(process.env.ANALYZE_BUNDLE === 'true' ? [new BundleAnalyzerPlugin()] : [])
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, './'),
    },
    compress: true,
    port: 3000,
    historyApiFallback: true,
    hot: false,
    liveReload: isDevelopment,
    open: true,
    client: {
      overlay: isDevelopment,
      progress: true,
    },
    devMiddleware: {
      writeToDisk: false,
    }
  },
  stats: isDevelopment ? 'minimal' : 'normal',
};
};
