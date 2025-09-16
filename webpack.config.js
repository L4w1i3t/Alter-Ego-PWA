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

// Determine if we're building for GitHub Pages
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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

module.exports = {
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
                content:
                  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.elevenlabs.io http://127.0.0.1:8000 ws:; media-src 'self' blob:; worker-src 'self'; manifest-src 'self'",
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
          to: 'service-worker.js'
        },
      ],
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        NODE_ENV: process.env.NODE_ENV || 'development',
        PUBLIC_URL: publicPath.slice(0, -1), // Remove trailing slash
        // Opt-in flag to enable immersive mode (soft devtools blocking) in production
        REACT_APP_IMMERSIVE_MODE: process.env.REACT_APP_IMMERSIVE_MODE || 'false',
      })
    }),
    new PerformanceMetricsPlugin(),
    // Add bundle analyzer only when explicitly requested
    ...(process.env.ANALYZE_BUNDLE === 'true' ? [new BundleAnalyzerPlugin()] : [])
  ],devServer: {
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
