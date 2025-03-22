const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

// Determine if we're building for GitHub Pages
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
// Use the correct repository name for GitHub Pages
const publicPath = isGitHubPages ? '/Alter-Ego-PWA/' : '/';

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'bundle.[contenthash].js' : 'bundle.js',
      publicPath: publicPath
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
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
          // Only include debug tool in development
          ...(isProduction ? [] : [
            {
              from: 'public/debug-tool.js',
              to: 'debug-tool.js'
            }
          ])
        ],
      }),
      new webpack.DefinePlugin({
        'process.env': JSON.stringify({
          NODE_ENV: isProduction ? 'production' : 'development',
          PUBLIC_URL: publicPath.slice(0, -1) // Remove trailing slash
        })
      }),
    ],
    optimization: {
      ...(isProduction ? {
        minimize: true,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: Infinity,
          minSize: 0,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                return `npm.${packageName.replace('@', '')}`;
              },
            },
          },
        },
      } : {})
    },
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
    },
    stats: 'errors-only',
  };
};