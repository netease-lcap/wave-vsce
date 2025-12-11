const path = require('path');

const extensionConfig = {
  target: 'node',
  // mode 将通过命令行参数设置，不在这里硬编码
  
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  devtool: 'nosources-source-map',
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json'
            }
          }
        ]
      }
    ]
  }
};

const webviewConfig = {
  target: 'web',
  // mode 将通过命令行参数设置，不在这里硬编码
  
  entry: './webview/src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'webview', 'dist'),
    filename: 'chat.js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    fallback: {
      "process": false,
      "buffer": false
    }
  },
  plugins: [
    new (require('webpack')).DefinePlugin({
      'process': false
    })
  ],
  performance: {
    hints: false, // Disable performance warnings
    maxAssetSize: 512000, // Increase max asset size (500 KiB)
    maxEntrypointSize: 512000 // Increase max entrypoint size (500 KiB)
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
              configFile: 'webview/tsconfig.json'
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

module.exports = [extensionConfig, webviewConfig];