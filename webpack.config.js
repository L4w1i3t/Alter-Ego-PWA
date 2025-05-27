const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const fs = require('fs');

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
    });

    // Add middleware to receive and save metrics
    if (compiler.options.devServer) {
      // Ensure the before function is called
      const originalBefore = compiler.options.devServer.onBeforeSetupMiddleware || (() => {});
      
      compiler.options.devServer.onBeforeSetupMiddleware = (devServer) => {
        // Call original before function
        if (originalBefore) {
          originalBefore(devServer);
        }
        
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
      };
    }
  }
}

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: publicPath
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  performance: {
    //hints: false, // Keeping this right now to disable large image warnings
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
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              experimentalWatchApi: true,
              // Add these options
              happyPackMode: true, // Better performance with thread-loader
              compilerOptions: {
                sourceMap: false // Disable source maps in development for faster builds
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
  plugins: [
    new HtmlWebpackPlugin({
      // Use the root index.html instead of the one in public
      template: './index.html',
      filename: 'index.html',
      inject: true
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
        PUBLIC_URL: publicPath.slice(0, -1) // Remove trailing slash
      })
    }),
    new PerformanceMetricsPlugin()
  ],
  devServer: {
    // Point to the root directory instead of public
    static: {
      directory: path.join(__dirname, './'),
    },
    compress: true,
    port: 3000,
    historyApiFallback: true,
    hot: false, // Disabled for now to prevent random reloads
    liveReload: false, // Disabled to prevent random reloads
    open: true,

    client: {
      overlay: false, // Disable overlay for errors in the browser
      progress: true, // Show progress in the console
    },
    devMiddleware: {
      writeToDisk: false,
    }
  },
  // stats: 'errors-only', // commented out for now to see all logs
};