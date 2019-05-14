const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

const env = dotenv.config();
const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  devtool: isDevelopment ? 'inline-source-map' : 'source-map',
  entry: {
    'app/index': './src/index.ts'
  },
  output: {
    filename: 'bundle.js'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(env.parsed)
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
