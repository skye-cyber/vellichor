#!/bin/bash

# 🎨 Vellichor - Cross-Device Control App
# Initialization Script

set -e  # Exit on error

echo "╔════════════════════════════════════════╗"
echo "║     🌙 Initializing Vellichor 🌙      ║"
echo "║   Where screens drift between devices  ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
# PURPLE='\033[0;35m'
# CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print colored step
step() {
  echo -e "${BLUE}➜${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
step "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { error "Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { error "npm is required but not installed."; exit 1; }
command -v git >/dev/null 2>&1 || { error "git is required but not installed."; exit 1; }

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
success "Node $NODE_VERSION, npm $NPM_VERSION detected"

# Check for optional tools
command -v docker >/dev/null 2>&1 && DOCKER=1 && success "Docker detected" || warn "Docker not found (optional for server)"
command -v lerna >/dev/null 2>&1 && LERNA=1 && success "Lerna detected" || warn "Lerna not found (will install locally)"
command -v watchman >/dev/null 2>&1 && success "Watchman detected" || warn "Watchman not found (recommended for React Native)"

# Create project root
step "Creating project structure..."
# mkdir -p vellichor
# cd vellichor

# Initialize git
step "Initializing git repository..."
git init >/dev/null
success "Git repository initialized"

# Create directory structure
step "Building directory tree..."
mkdir -p mobile/src/{api/{discovery,signaling,webrtc,filetransfer},components/{common,discovery,streaming,control,files},hooks,screens/{Home,Discovery,Connection,ScreenShare,RemoteControl,FileTransfer,Settings},services/{webrtc,discovery,capture,input,storage},store/{slices,middlewares},utils,types,native/{android/src/main/java/com/vellichor,ios/Vellichor}}
mkdir -p desktop/src/{main/{ipc,menu,windows},renderer/{components,hooks,screens,store},native/{win32,macos},shared}
mkdir -p server/src/{controllers,services,middleware,models,utils,types,docker}
mkdir -p shared/{constants,types,utils}
mkdir -p docs/{architecture,api,protocols,development}
mkdir -p e2e/{mobile,desktop}
mkdir -p scripts

success "Directory structure created"

# Create root package.json
step "Creating root package.json..."
cat > package.json << 'EOF'
{
  "name": "vellichor",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "mobile",
    "desktop",
    "server",
    "shared"
  ],
  "scripts": {
    "bootstrap": "lerna bootstrap",
    "clean": "lerna clean",
    "build": "lerna run build",
    "dev:mobile": "cd mobile && npm run start",
    "dev:desktop": "cd desktop && npm run start",
    "dev:server": "cd server && npm run dev",
    "test": "lerna run test",
    "lint": "lerna run lint",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\"",
    "prepare": "husky install"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "husky": "^8.0.0",
    "lerna": "^7.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
EOF
success "Root package.json created"

# Create Lerna config
step "Creating lerna.json..."
cat > lerna.json << 'EOF'
{
  "version": "0.1.0",
  "npmClient": "npm",
  "packages": [
    "mobile",
    "desktop",
    "server",
    "shared"
  ]
}
EOF
success "Lerna config created"

# Create TypeScript config
step "Creating tsconfig.base.json..."
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-native",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "exclude": [
    "node_modules",
    "**/__tests__/*",
    "**/android/**",
    "**/ios/**"
  ]
}
EOF
success "TypeScript base config created"

# Create .gitignore
step "Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
**/node_modules/

# Build outputs
dist/
build/
**/dist/
**/build/
*.js.map
*.d.ts

# React Native
mobile/android/app/build/
mobile/ios/build/
mobile/ios/Pods/
mobile/ios/*.xcworkspace/
mobile/ios/*.xcodeproj/xcuserdata/

# Electron
desktop/out/
desktop/dist/

# Server
server/dist/
server/coverage/

# Environment
.env
.env.local
.env.*.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Temporary files
tmp/
temp/
*.tmp

# Certificates
*.pem
*.p12
*.pfx
EOF
success ".gitignore created"

# Create .env.example
step "Creating .env.example..."
cat > .env.example << 'EOF'
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:8081,http://localhost:3000

# WebRTC
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=turn:turn.example.com:3478
TURN_USERNAME=username
TURN_CREDENTIAL=password

# Security
JWT_SECRET=your-secret-key-here
ENCRYPTION_KEY=32-byte-hex-key-here

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug
EOF
success ".env.example created"

# Create README
step "Creating README.md..."
cat > README.md << 'EOF'
# 🌙 Vellichor

*Where screens drift between devices*

Vellichor is a cross-device control application that allows you to share screens and control devices between your phone and laptop bidirectionally.

## ✨ Features

- 🔍 **Device Discovery** - Automatically find devices on your local network
- 📱 **Screen Sharing** - View your phone screen on laptop and vice versa
- 🎮 **Remote Control** - Control devices from either end
- 📁 **File Transfer** - Seamlessly share files between devices
- 🔒 **Secure** - End-to-end encrypted communication

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- React Native development environment
- For desktop: Windows SDK or Xcode (depending on platform)

### Installation

```bash
# Clone and enter project
git clone https://github.com/yourusername/vellichor.git
cd vellichor

# Run initialization script
chmod +x init-vellichor.sh
./init-vellichor.sh

# Install dependencies
npm run bootstrap

# Start development
npm run dev:mobile  # For mobile app
npm run dev:desktop # For desktop app
npm run dev:server  # For signaling server
EOF
success "README.md created"

# Initialize mobile app
step "Initializing React Native mobile app..."
cd mobile
# Update mobile package.json
step "Configuring mobile package.json..."
cat > mobile/package.json << 'EOF'
{
  "name": "@vellichor/mobile",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "typecheck": "tsc --noEmit",
    "build:android": "cd android && ./gradlew assembleRelease",
    "build:ios": "cd ios && xcodebuild -workspace Vellichor.xcworkspace -scheme Vellichor -configuration Release"
  },
  "dependencies": {
    "@reduxjs/toolkit": "^1.9.0",
    "react": "18.2.0",
    "react-native": "0.72.0",
    "react-native-gesture-handler": "^2.12.0",
    "react-native-reanimated": "^3.3.0",
    "react-native-safe-area-context": "^4.7.0",
    "react-native-screens": "^3.22.0",
    "react-native-vector-icons": "^10.0.0",
    "react-native-webrtc": "^111.0.0",
    "react-native-fs": "^2.20.0",
    "react-redux": "^8.1.0",
    "socket.io-client": "^4.7.0",
    "redux-persist": "^6.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@babel/preset-env": "^7.20.0",
    "@babel/runtime": "^7.20.0",
    "@react-native/eslint-config": "^0.72.0",
    "@react-native/metro-config": "^0.72.0",
    "@react-native/typescript-config": "^0.72.0",
    "@types/jest": "^29.5.0",
    "@types/react": "^18.2.0",
    "@types/react-test-renderer": "^18.0.0",
    "babel-jest": "^29.2.1",
    "eslint": "^8.19.0",
    "jest": "^29.2.1",
    "prettier": "^2.4.1",
    "react-test-renderer": "18.2.0",
    "typescript": "5.0.4"
  },
  "engines": {
    "node": ">=18"
  }
}
EOF
success "Mobile package.json configured"

npx @react-native-community/cli init Vellichor --template react-native-template-typescript || {
  error "Failed to initialize React Native app"
#   exit 1
}

# Clean up default files and set up structure
cd Vellichor
rm -f App.tsx
rm -f __tests__/App-test.tsx
cd ../..
success "Mobile app initialized"

# Initialize desktop app
step "Initializing Electron desktop app..."
cd desktop
npm init -y >/dev/null
npm install --save-dev electron @electron-forge/cli @electron-forge/maker-deb @electron-forge/maker-rpm @electron-forge/maker-squirrel @electron-forge/maker-zip typescript @types/react @types/react-dom >/dev/null 2>&1
npm install --save react react-dom electron-is-dev electron-store socket.io-client >/dev/null 2>&1

# Create main entry point
mkdir -p src/main
cat > src/main/index.ts << 'EOF'
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: !isDev,
    },
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../renderer/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
EOF

# Create renderer entry
mkdir -p src/renderer
cat > src/renderer/index.html << 'EOF'
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Vellichor Desktop</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="./renderer.js"></script>
  </body>
</html>
EOF
cd ..
success "Desktop app initialized"

# Initialize server
step "Initializing signaling server..."
cd server
npm init -y >/dev/null
npm install --save express socket.io cors dotenv winston helmet express-rate-limit redis >/dev/null 2>&1
npm install --save-dev typescript @types/express @types/node @types/cors @types/socket.io @types/winston nodemon ts-node >/dev/null 2>&1

# Create server entry
mkdir -p src
cat > src/app.ts << 'EOF'
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8081'],
    credentials: true
  }
});

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(','),
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    logger.info(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('signal', (data: any) => {
    socket.to(data.roomId).emit('signal', {
      from: socket.id,
      signal: data.signal
    });
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Vellichor signaling server running on port ${PORT}`);
});

export { app, io };
EOF
cd ..
success "Server initialized"

# Create shared package
step "Creating shared package..."
cd shared
npm init -y >/dev/null
npm install --save-dev typescript @types/node >/dev/null 2>&1

cat > package.json << 'EOF'
{
  "name": "@vellichor/shared",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
EOF

mkdir -p src/types src/constants src/utils
cat > src/index.ts << 'EOF'
export * from './types';
export * from './constants';
export * from './utils';
EOF
cd ..
success "Shared package created"

# Install dependencies
step "Installing dependencies..."
npm install >/dev/null 2>&1
npx lerna bootstrap >/dev/null 2>&1
success "Dependencies installed"

# Create git hooks
step "Setting up git hooks..."
mkdir -p .husky
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
EOF
chmod +x .husky/pre-commit
success "Git hooks configured"

# Create development scripts
step "Creating development scripts..."

cat > scripts/setup-dev.sh << 'EOF'
#!/bin/bash
# Development environment setup

echo "🔧 Setting up Vellichor development environment..."

# Install iOS pods if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "📱 Installing iOS pods..."
  cd mobile/ios && pod install
fi

# Generate native module stubs
echo "🔨 Generating native module stubs..."
cd ../..

# Copy environment variables
if [ ! -f server/.env ]; then
  cp .env.example server/.env
  echo "✅ Created server/.env from template"
fi

echo "✨ Development environment ready!"
EOF
chmod +x scripts/setup-dev.sh

cat > scripts/build-all.sh << 'EOF'
#!/bin/bash
# Build all components

echo "🏗️  Building Vellichor..."

# Build shared
echo "📦 Building shared..."
cd shared && npm run build

# Build mobile
echo "📱 Building mobile..."
cd ../mobile && npm run typecheck

# Build desktop
echo "💻 Building desktop..."
cd ../desktop && npm run make

# Build server
echo "🌐 Building server..."
cd ../server && npm run build

echo "✅ All builds complete!"
EOF
chmod +x scripts/build-all.sh

cat > scripts/dev.sh << 'EOF'
#!/bin/bash
# Start development environment

case "$1" in
  mobile)
    cd mobile && npm run start
    ;;
  desktop)
    cd desktop && npm run start
    ;;
  server)
    cd server && npm run dev
    ;;
  all)
    echo "Starting all services..."
    concurrently \
      "cd mobile && npm run start" \
      "cd server && npm run dev" \
      "cd desktop && npm run start"
    ;;
  *)
    echo "Usage: ./dev.sh [mobile|desktop|server|all]"
    ;;
esac
EOF
chmod +x scripts/dev.sh
success "Development scripts created"

# Create .nvmrc for Node version
echo "v18.17.0" > .nvmrc
success "Created .nvmrc"

# Create editorconfig
cat > .editorconfig << 'EOF'
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.{js,jsx,ts,tsx,json,yml,yaml}]
indent_size = 2

[*.{md,markdown}]
trim_trailing_whitespace = false
EOF
success "Created .editorconfig"

# Create prettier config
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
EOF
success "Created .prettierrc"

# Create eslint config
cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  env: {
    browser: true,
    node: true,
    jest: true,
    es2020: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true,
      },
    },
  ],
};
EOF

success "Created .eslintrc.js"

# Create license
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 Vellichor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
success "Created LICENSE"

# Final steps
step "Finalizing setup..."
cd ..

# Create a welcome message
cat > WELCOME.md << 'EOF'
# 🌙 Welcome to Vellichor

```
__     ___    _ _     _
\ \   / / |  | | |   (_)
 \ \ / /| |  | | |__  _  ___  _ __ ___
  \ V / | |  | | '_ \| |/ _ \| '__/ _ \
   | |  | |__| | | | | | (_) | | | (_) |
   |_|   \____/|_| |_|_|\___/|_|  \___/

Where screens drift between devices
```

## 🎯 Your Project Structure

```
vellichor/
├── 📱 mobile/     # React Native app
├── 💻 desktop/    # Electron desktop app
├── 🌐 server/     # Signaling server
├── 📦 shared/     # Shared code
└── 📚 docs/       # Documentation
```

## 🚀 Quick Start

```bash
# Start mobile dev server
npm run dev:mobile

# Start desktop app
npm run dev:desktop

# Start signaling server
npm run dev:server
```

## 📖 Next Steps

1. **Read the docs**: Check out `docs/development/README.md`
2. **Set up native modules**: Run `./scripts/setup-dev.sh`
3. **Build everything**: Run `./scripts/build-all.sh`
4. **Start developing**: Run `./scripts/dev.sh all`

## 🎨 The Story Behind the Name

*Vellichor* - the strange wistfulness of used bookstores, which are somehow infused with the passage of time. Your screens, like old books, carry the patina of your interactions, and Vellichor lets them drift between devices, carrying that history with them.

Happy coding! 🌙
EOF

# Print summary
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     ✨ Vellichor initialization complete! ✨           ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║                                                         ║"
echo "║  📁 Project location: $(pwd)/vellichor                  "
echo "║                                                         ║"
echo "║  🚀 Next steps:                                          ║"
echo "║     cd vellichor                                        ║"
echo "║     cat WELCOME.md  # Read the welcome guide           ║"
echo "║     ./scripts/setup-dev.sh  # Set up dev environment   ║"
echo "║                                                         ║"
echo "║  📚 Documentation:                                       ║"
echo "║     docs/development/README.md                          ║"
echo "║                                                         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo -e "${CYAN}May your screens drift beautifully between devices! 🌙${NC}"
echo ""
