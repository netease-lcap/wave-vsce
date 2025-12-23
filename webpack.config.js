const path = require('path');

// 使用环境变量判断是否只打包前端
const onlyFrontend = process.env.ONLY_FRONTEND === 'true';

const extensionConfig = {
  target: 'node',
  // mode 将通过命令行参数设置，不在这里硬编码
  
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@vscode/ripgrep': path.resolve(__dirname, 'src/ripgrep.ts')
    }
  },
  cache: {
    type: 'filesystem', // Enable filesystem caching for faster rebuilds
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
              configFile: 'tsconfig.json',
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
  cache: {
    type: 'filesystem', // Enable filesystem caching for faster rebuilds
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
              configFile: 'webview/tsconfig.json',
            }
          }
        ]
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(ttf|woff|woff2)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]'
        }
      }
    ]
  }
};

// 根据环境变量决定导出哪些配置
if (onlyFrontend) {
  console.log('只打包前端...');
  module.exports = webviewConfig;
} else {
  console.log('同时打包前后端...');
  module.exports = [extensionConfig, webviewConfig];
}