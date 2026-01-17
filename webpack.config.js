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

  // Use the correct repository name for GitHub Pages
  const publicPath = isGitHubPages ? '/Alter-Ego-PWA/' : '/';

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
      // Inject a production-only CSP meta for stronger security without breaking dev tooling
      ...(isDevelopment
        ? {}
        : {
            meta: {
              'Content-Security-Policy': {
                'http-equiv': 'Content-Security-Policy',
                // Note: frame-ancestors is ignored in meta; enforced via HTTP headers on Vercel
                content:
                  "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.elevenlabs.io http://127.0.0.1:8000 ws: wss:; media-src 'self' blob: data:; worker-src 'self'; manifest-src 'self'",
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
