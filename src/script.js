//script.js
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import '@xterm/xterm/css/xterm.css';

// ANSI color codes for terminal formatting
const colors = {
  reset: '\x1B[0m',
  bold: '\x1B[1m',
  italic: '\x1B[3m',
  green: '\x1B[1;32m',
  blue: '\x1B[1;34m',
  yellow: '\x1B[1;33m',
  red: '\x1B[1;3;31m'
};

var term = new Terminal();
term.open(document.getElementById('terminal'));

// Fit terminal to container
let fitAddon = new FitAddon();
term.loadAddon(fitAddon);
fitAddon.fit();
window.addEventListener('resize', () => {
  fitAddon.fit();
});

term.open(document.getElementById('terminal'));
term.loadAddon(new WebLinksAddon());

let currentInput = '';
let currentLine = '';
let cursorPosition = 0;

// Available commands

// --- Virtual File System ---
let vfs = {};
const VFS_KEY = 'miaoshell-vfs';
let cwd_path = '/'; // Current working directory

//convert cwd to a return vfs object
function cwd() {
  if (cwd_path === '/') {
    return vfs;
  }
  const parts = cwd_path.split('/').filter(Boolean);
  let current = vfs;
  for (const part of parts) {
    if (current[part] && typeof current[part] === 'object') {
      current = current[part];
    } else {
      return {}; // Return empty object if path doesn't exist
    }
  }
  return current;
}

//convert vfs object to cwd path
function vfsToCwd(vfsObj) {
  if (vfsObj === vfs) {
    return '/';
  }
  const parts = [];
  function findPath(obj, currentPath) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newPath = currentPath ? `${currentPath}/${key}` : key;
        if (obj[key] === vfsObj) {
          parts.push(newPath);
          return true; // Found the path
        }
        if (typeof obj[key] === 'object') {
          if (findPath(obj[key], newPath)) {
            return true; // Found in subdirectory
          }
        }
      }
    }
    return false; // Not found in this branch
  }
  findPath(vfs, '');
  return parts.length > 0 ? parts[0] : '/'; // Return first found path or root
}


function loadVFS() {
  try {
    const data = localStorage.getItem(VFS_KEY);
    if (data) vfs = JSON.parse(data);
    else vfs = {};
  } catch (e) {
    vfs = {};
  }
}

function saveVFS() {
  localStorage.setItem(VFS_KEY, JSON.stringify(vfs));
}

// Load VFS on startup
loadVFS();

function getSizeInKB(variable) {
  const json = JSON.stringify(variable);
  const bytes = new TextEncoder().encode(json).length;
  const kb = bytes / 1024;
  return kb;
}

const commands = {
  help: () => {
    term.writeln('\r\nAvailable commands:');
    term.writeln('  help     - Show this help message');
    term.writeln('  clear    - Clear the terminal');
    term.writeln('  echo     - Echo back your message');
    term.writeln('  date     - Show current date and time');
    term.writeln('  cd       - Change directory: cd dirname or cd .. or cd (for root)');
    term.writeln('  ls       - List files in the current directory');
    term.writeln('  cat      - Show file contents: cat filename');
    term.writeln('  write    - Write to a file: write filename content');
    term.writeln('  mkdir    - Create directory: mkdir dirname');
    term.writeln('  rmdir    - Remove directory: rmdir dirname');
    term.writeln('  rm       - Remove a file: rm filename');
    term.writeln('  save     - Save VFS to browser storage');
    term.writeln('  load     - Load VFS from browser storage');
    term.writeln('  import   - Import VFS from JSON file: import filename.json');
    term.writeln('  storage  - Show VFS storage usage');
    term.writeln('  about    - About this terminal');
  },
  clear: () => {
    setTimeout(() => {
      term.clear();
    }, 0);
  },
  echo: (args) => {
    term.writeln('\r\n' + args.join(' '));
  },
  date: () => {
    term.writeln('\r\n' + new Date().toString());
  },
  cd: (args) => {
    if (args.length === 0) {
      cwd_path = '/';
      term.writeln(`\r\nChanged directory to: ${cwd_path}`);
      return;
    }
    const dir = args[0];
    if (dir === '..') {
      if (cwd_path !== '/') {
        const parts = cwd_path.split('/').filter(Boolean);
        parts.pop(); // Go up one directory
        cwd_path = '/' + parts.join('/');
        if (cwd_path === '/') cwd_path = '/'; // Ensure root path
      }
    } else {
      const currentDir = cwd();
      if (currentDir[dir] && typeof currentDir[dir] === 'object') {
        cwd_path = cwd_path === '/' ? `/${dir}` : `${cwd_path}/${dir}`;
      } else {
        term.writeln(`\r\nNo such directory: ${dir}`);
        return;
      }
    }
    term.writeln(`\r\nChanged directory to: ${cwd_path}`);
  },
  ls: () => {
    const currentDir = cwd();
    const files = Object.keys(currentDir);
    if (files.length === 0) term.writeln('\r\n(no files)');
    else {
      const displayFiles = files.map(file => {
        return typeof currentDir[file] === 'object' ? file + '/' : file;
      });
      term.writeln('\r\n' + displayFiles.join('  '));
    }
  },
  cat: (args) => {
    if (!args[0]) {
      term.writeln('\r\nUsage: cat filename');
      return;
    }
    const file = args[0];
    const currentDir = cwd();
    if (currentDir[file] !== undefined && typeof currentDir[file] !== 'object') {
      term.writeln('\r\n' + currentDir[file]);
    } else {
      term.writeln(`\r\nFile not found: ${file}`);
    }
  },
  write: (args) => {
    if (!args[0]) {
      term.writeln('\r\nUsage: write filename content');
      return;
    }
    const file = args[0];
    const content = args.slice(1).join(' ');
    const currentDir = cwd();
    currentDir[file] = content;
    term.writeln(`\r\nWrote to ${file}`);
  },
  mkdir: (args) => {
    if (!args[0]) {
      term.writeln('\r\nUsage: mkdir directory_name');
      return;
    }
    const dir = args[0];
    const currentDir = cwd();
    if (currentDir[dir] !== undefined) {
      term.writeln(`\r\nDirectory already exists: ${dir}`);
      return;
    }
    currentDir[dir] = {}; // Create an empty directory
    term.writeln(`\r\nCreated directory: ${dir}`);
  },
  rmdir: (args) => {
    if (!args[0]) {
      term.writeln('\r\nUsage: rmdir directory_name');
      return;
    }
    const dir = args[0];
    const currentDir = cwd();
    if (currentDir[dir] !== undefined && typeof currentDir[dir] === 'object') {
      delete currentDir[dir];
      term.writeln(`\r\nRemoved directory: ${dir}`);
    } else {
      term.writeln(`\r\nDirectory not found: ${dir}`);
    }
  },
  rm: (args) => {
    if (!args[0]) {
      term.writeln('\r\nUsage: rm filename');
      return;
    }
    const file = args[0];
    const currentDir = cwd();
    if (currentDir[file] !== undefined && typeof currentDir[file] !== 'object') {
      delete currentDir[file];
      term.writeln(`\r\nDeleted ${file}`);
    } else {
      term.writeln(`\r\nFile not found: ${file}`);
    }
  },
  save: () => {
    saveVFS();
    term.writeln('\r\nVFS saved to browser storage.');
  },
  load: () => {
    loadVFS();
    term.writeln('\r\nVFS loaded from browser storage.');
  },
  import: (args) => {
    if (!args[0]) {
      term.writeln('\r\nUsage: import filename.json');
      return;
    }
    const filename = args[0];
    fetch(filename)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        Object.assign(vfs, data);
        saveVFS();
        term.writeln(`\r\nImported ${Object.keys(data).length} files from ${filename}`);
      })
      .catch(error => {
        term.writeln(`\r\nError importing ${filename}: ${error.message}`);
      });
  },
  storage: () => {
    term.writeln('\r\nVirtual File System Storage:');
    term.writeln(`${getSizeInKB(vfs).toFixed(2)} KB / 512 KB`);
    term.writeln(`(${Object.keys(vfs).length} files)`);
    term.writeln(`(${(getSizeInKB(vfs) / 512 * 100).toFixed(2)}% used)`);
  },
  about: () => {
    term.writeln('\r\n' + colors.bold + 'MiaoShell' + colors.reset + ' - A Useless Terminal');
    term.writeln('Version: 1.0.0');
    term.writeln('https://github.com/daniel4-scratch/xtermtest');
  }
};

function executeCommand(input) {
  const parts = input.trim().split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (command === '') {
    return;
  }

  if (commands[command]) {
    commands[command](args);
  } else {
    term.writeln('\r\nCommand not found: ' + command);
    term.writeln('Type "help" for available commands.');
  }
}

function prompt() {
  const displayPath = cwd_path === '/' ? '~' : cwd_path;
  term.write(`\r\n${colors.green}user@miaoshell${colors.reset}:${colors.blue}${displayPath}${colors.reset}$ `);
}

// Handle user input
term.onData(data => {
  const code = data.charCodeAt(0);

  if (code === 13) { // Enter key
    executeCommand(currentInput);
    currentInput = '';
    prompt();
  } else if (code === 127) { // Backspace
    if (currentInput.length > 0) {
      currentInput = currentInput.slice(0, -1);
      term.write('\b \b');
    }
  } else if (code >= 32) { // Printable characters
    currentInput += data;
    term.write(data);
  } else if (code === 27) { // Escape key
    // Handle escape sequences if needed
  }
});

async function init() {
  // Initialize terminal
  //print /assets/miao.txt
  await fetch('./assets/miao.txt')
    .then(response => {
      if (response.status === 200) {
        return response.text();
      } else {
        throw new Error('HTTP ' + response.status);
      }
    })
    .then(text => {
      text.split(/\r?\n/).forEach(line => term.writeln(line));
    })
    .catch(error => {
      term.writeln('Error loading file: ' + error);
    });
  term.writeln(`Welcome to ${colors.red}MiaoShell${colors.reset} - A Useless Terminal!`);
  term.writeln(`Type ${colors.yellow}help${colors.reset} to see available commands.`);
  prompt();
};

init().catch(err => {
  console.error('Error initializing terminal:', err);
  term.writeln('Error initializing terminal. Check console for details.');
});
