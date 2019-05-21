const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

const env = dotenv.config();
const isDevelopment = process.env.NODE_ENV !== 'production';
console.log({env, process: process.env});

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  devtool: isDevelopment ? 'inline-source-map' : 'source-map',
  entry: {
    'app/index': './src/index.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist/js'),
    filename: 'bundle.js'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        CALENDAR_ID: env.parsed.CALENDAR_ID,
        API_KEY: env.parsed.API_KEY,
        TIME_ZONE: env.parsed.TIME_ZONE
      })
    })
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  optimization: {
    minimizer: [new UglifyJsPlugin()]
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
};
