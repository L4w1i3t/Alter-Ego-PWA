const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

// Determine if we're building for GitHub Pages
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
// Use the correct repository name for GitHub Pages
const publicPath = isGitHubPages ? '/Alter-Ego-PWA/' : '/';

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
  ],
  devServer: {
    // Point to the root directory instead of public
    static: {
      directory: path.join(__dirname, './'),
    },
    compress: true,
    port: 3000,
    historyApiFallback: true,
    hot: true,
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