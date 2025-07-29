// Virtual File System functionality and commands
const VFS_KEY = 'miaoshell-vfs';

let vfs = {};
let cwd_path = '/'; // Current working directory

// Convert cwd to a return vfs object
export function cwd() {
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

// Convert vfs object to cwd path
export function vfsToCwd(vfsObj) {
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

export function loadVFS() {
  try {
    const data = localStorage.getItem(VFS_KEY);
    if (data) vfs = JSON.parse(data);
    else vfs = {};
  } catch (e) {
    vfs = {};
  }
}

export function saveVFS() {
  localStorage.setItem(VFS_KEY, JSON.stringify(vfs));
}

export function getSizeInKB(variable) {
  const json = JSON.stringify(variable);
  const bytes = new TextEncoder().encode(json).length;
  const kb = bytes / 1024;
  return kb;
}

// Getters and setters for VFS and path
export function getVFS() {
  return vfs;
}

export function setVFS(newVFS) {
  vfs = newVFS;
}

export function getCwdPath() {
  return cwd_path;
}

export function setCwdPath(newPath) {
  cwd_path = newPath;
}

// VFS Commands - these take a term parameter for output
export const commands = {
  cd: (term, args) => {
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

  ls: (term) => {
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

  cat: (term, args) => {
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

  write: (term, args) => {
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

  mkdir: (term, args) => {
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

  rmdir: (term, args) => {
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

  rm: (term, args) => {
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

  save: (term) => {
    saveVFS();
    term.writeln('\r\nVFS saved to browser storage.');
  },

  load: (term) => {
    loadVFS();
    term.writeln('\r\nVFS loaded from browser storage.');
  },

  import: (term) => {
    return new Promise((resolve, reject) => {
      try {
        // Create a hidden file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        // Handle file selection
        input.onchange = async (event) => {
          try {
            const file = event.target.files[0];
            if (!file) {
              term.writeln('\r\nNo file selected.');
              resolve();
              return;
            }
            
            if (file.size > 512 * 1024) {
              term.writeln('\r\nFile is too large. Maximum size is 512 KB.');
              resolve();
              return;
            }
            
            try {
              const fileContent = await file.text();
              // Check if valid JSON
              try {
                const importedVFS = JSON.parse(fileContent);
                if (typeof importedVFS === 'object' && importedVFS !== null) {
                  vfs = importedVFS;
                  cwd_path = '/'; // Reset to root after import
                  term.writeln('\r\nVFS imported successfully.');
                } else {
                  term.writeln('\r\nInvalid VFS format. Must be a JSON object.');
                }
              } catch (e) {
                term.writeln('\r\nError parsing VFS file. Ensure it is a valid JSON object.');
              }
            } catch (error) {
              term.writeln('\r\nError reading file: ' + error.message);
            }
            
            resolve();
          } catch (error) {
            term.writeln('\r\nError importing VFS: ' + error.message);
            resolve();
          } finally {
            // Clean up
            if (document.body.contains(input)) {
              document.body.removeChild(input);
            }
          }
        };
        
        // Handle cancellation
        input.oncancel = () => {
          term.writeln('\r\nImport cancelled.');
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
          resolve();
        };
        
        // Trigger file picker
        document.body.appendChild(input);
        input.click();
        
      } catch (error) {
        term.writeln('\r\nError importing VFS: ' + error.message);
        reject(error);
      }
    });
  },

  export: (term) => {
    const vfsString = JSON.stringify(vfs, null, 2);
    const blob = new Blob([vfsString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vfs.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    term.writeln('\r\nVFS exported as vfs.json');
  },

  storage: (term) => {
    term.writeln('\r\nVirtual File System Storage:');
    term.writeln(`${getSizeInKB(vfs).toFixed(2)} KB / 512 KB`);
    term.writeln(`(${Object.keys(vfs).length} files)`);
    term.writeln(`(${(getSizeInKB(vfs) / 512 * 100).toFixed(2)}% used)`);
  }
};