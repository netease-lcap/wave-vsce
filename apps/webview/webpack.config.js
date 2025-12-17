const path = require('path');

module.exports = {
  target: 'web',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, '../../apps/vsce/webview/dist'),
    filename: 'chat.js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    fallback: {
      "process": false,
      "buffer": false
    }
  },
  cache: {
    type: 'filesystem',
  },
  plugins: [
    new (require('webpack')).DefinePlugin({
      'process': false
    })
  ],
  performance: {
    hints: false,
    maxAssetSize: 512000,
    maxEntrypointSize: 512000
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
            }
          }
        ]
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};