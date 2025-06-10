/**
 * 备用随机 SVG 图标 - 优化设计
 */
export const fallbackSVGIcons = [
  `<svg width="80" height="80" viewBox="0 0 24 24" fill="url(#gradient1)" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
         <stop offset="0%" stop-color="#7209b7" />
         <stop offset="100%" stop-color="#4cc9f0" />
       </linearGradient>
     </defs>
     <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
   </svg>`,
  `<svg width="80" height="80" viewBox="0 0 24 24" fill="url(#gradient2)" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
         <stop offset="0%" stop-color="#4361ee" />
         <stop offset="100%" stop-color="#4cc9f0" />
       </linearGradient>
     </defs>
     <circle cx="12" cy="12" r="10"/>
     <path d="M12 7v5l3.5 3.5 1.42-1.42L14 11.58V7h-2z" fill="#fff"/>
   </svg>`,
  `<svg width="80" height="80" viewBox="0 0 24 24" fill="url(#gradient3)" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
         <stop offset="0%" stop-color="#7209b7" />
         <stop offset="100%" stop-color="#4361ee" />
       </linearGradient>
     </defs>
     <path d="M12 .587l3.668 7.431L24 9.172l-6 5.843 1.416 8.252L12 19.771l-7.416 3.496L6 15.015 0 9.172l8.332-1.154z"/>
   </svg>`,
];

function getRandomSVG() {
  return fallbackSVGIcons[Math.floor(Math.random() * fallbackSVGIcons.length)];
}

/**
 * 渲染单个网站卡片（优化版）
 */
function renderSiteCard(site) {
  const logoHTML = site.logo
    ? `<img src="${site.logo}" alt="${site.name}"/>`
    : getRandomSVG();

  return `
    <div class="channel-card" data-id="${site.id}">
      <div class="channel-number">${site.id}</div>
      <h3 class="channel-title">${site.name || '未命名'}</h3>
      <span class="channel-tag">${site.catelog}</span>
      <div class="logo-wrapper">${logoHTML}</div>
      <p class="channel-desc">${site.desc || '暂无描述'}</p>
      <a href="${site.url}" target="_blank" class="channel-link">${site.url}</a>
      <button class="copy-btn" data-url="${site.url}" title="复制链接">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <div class="copy-success">已复制!</div>
    </div>
  `;
}

/**
 * 处理 API 请求
 */
const api = {
  async handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', ''); // 去掉 "/api" 前缀
    const method = request.method;
    const id = url.pathname.split('/').pop(); // 获取最后一个路径段，作为 id (例如 /api/config/1)
    try {
      if (path === '/config') {
        switch (method) {
          case 'GET':
            return await this.getConfig(request, env, ctx, url);
          case 'POST':
            return await this.createConfig(request, env, ctx);
          default:
            return this.errorResponse('Method Not Allowed', 405);
        }
      }
      if (path === '/config/submit' && method === 'POST') {
        return await this.submitConfig(request, env, ctx);
      }
      if (path === `/config/${id}` && /^\d+$/.test(id)) {
        switch (method) {
          case 'PUT':
            return await this.updateConfig(request, env, ctx, id);
          case 'DELETE':
            return await this.deleteConfig(request, env, ctx, id);
          default:
            return this.errorResponse('Method Not Allowed', 405);
        }
      }
      if (path === `/pending/${id}` && /^\d+$/.test(id)) {
        switch (method) {
          case 'PUT':
            return await this.approvePendingConfig(request, env, ctx, id);
          case 'DELETE':
            return await this.rejectPendingConfig(request, env, ctx, id);
          default:
            return this.errorResponse('Method Not Allowed', 405);
        }
      }
      if (path === '/config/import' && method === 'POST') {
        return await this.importConfig(request, env, ctx);
      }
      if (path === '/config/export' && method === 'GET') {
        return await this.exportConfig(request, env, ctx);
      }
      if (path === '/pending' && method === 'GET') {
        return await this.getPendingConfig(request, env, ctx, url);
      }
      if (path === '/categories' && method === 'GET') {
        return await this.getCategories(request, env, ctx);
      }
      return this.errorResponse('Not Found', 404);
    } catch (error) {
      return this.errorResponse(`Internal Server Error: ${error.message}`, 500);
    }
  },
  async getConfig(request, env, ctx, url) {
    const catalog = url.searchParams.get('catalog');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const keyword = url.searchParams.get('keyword');
    const offset = (page - 1) * pageSize;
    try {
      let query = `SELECT * FROM sites ORDER BY create_time DESC LIMIT ? OFFSET ?`;
      let countQuery = `SELECT COUNT(*) as total FROM sites`;
      let queryBindParams = [pageSize, offset];
      let countQueryParams = [];

      if (catalog) {
        query = `SELECT * FROM sites WHERE catelog = ? ORDER BY create_time DESC LIMIT ? OFFSET ?`;
        countQuery = `SELECT COUNT(*) as total FROM sites WHERE catelog = ?`;
        queryBindParams = [catalog, pageSize, offset];
        countQueryParams = [catalog];
      }

      if (keyword) {
        const likeKeyword = `%${keyword}%`;
        query = `SELECT * FROM sites WHERE name LIKE ? OR url LIKE ? OR catelog LIKE ? ORDER BY create_time DESC LIMIT ? OFFSET ?`;
        countQuery = `SELECT COUNT(*) as total FROM sites WHERE name LIKE ? OR url LIKE ? OR catelog LIKE ?`;
        queryBindParams = [likeKeyword, likeKeyword, likeKeyword, pageSize, offset];
        countQueryParams = [likeKeyword, likeKeyword, likeKeyword];

        if (catalog) {
          query = `SELECT * FROM sites WHERE catelog = ? AND (name LIKE ? OR url LIKE ? OR catelog LIKE ?) ORDER BY create_time DESC LIMIT ? OFFSET ?`;
          countQuery = `SELECT COUNT(*) as total FROM sites WHERE catelog = ? AND (name LIKE ? OR url LIKE ? OR catelog LIKE ?)`;
          queryBindParams = [catalog, likeKeyword, likeKeyword, likeKeyword, pageSize, offset];
          countQueryParams = [catalog, likeKeyword, likeKeyword, likeKeyword];
        }
      }

      const { results } = await env.NAV_DB.prepare(query).bind(...queryBindParams).all();
      const countResult = await env.NAV_DB.prepare(countQuery).bind(...countQueryParams).first();
      const total = countResult ? countResult.total : 0;

      return new Response(
        JSON.stringify({
          code: 200,
          data: results,
          total,
          page,
          pageSize
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      console.error('Error fetching config:', e); // Log error for debugging
      return this.errorResponse(`Failed to fetch config data: ${e.message}`, 500);
    }
  },
  async getCategories(request, env, ctx) {
    try {
      const { results } = await env.NAV_DB.prepare('SELECT DISTINCT catelog FROM sites').all();
      const categories = results.map(row => row.catelog).filter(c => c); // 确保不返回空值
      return new Response(JSON.stringify({ code: 200, data: categories }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return this.errorResponse(`Failed to fetch categories: ${e.message}`, 500);
    }
  },
  async getPendingConfig(request, env, ctx, url) {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const offset = (page - 1) * pageSize;
    try {
      const { results } = await env.NAV_DB.prepare(`SELECT * FROM pending_sites ORDER BY create_time DESC LIMIT ? OFFSET ?`).bind(pageSize, offset).all();
      const countResult = await env.NAV_DB.prepare(`SELECT COUNT(*) as total FROM pending_sites`).first();
      const total = countResult ? countResult.total : 0;
      return new Response(
        JSON.stringify({
          code: 200,
          data: results,
          total,
          page,
          pageSize
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      return this.errorResponse(`Failed to fetch pending config data: ${e.message}`, 500);
    }
  },
  async approvePendingConfig(request, env, ctx, id) {
    try {
      const { results } = await env.NAV_DB.prepare('SELECT * FROM pending_sites WHERE id = ?').bind(id).all();
      if (results.length === 0) {
        return this.errorResponse('Pending config not found', 404);
      }
      const config = results[0];
      await env.NAV_DB.prepare(`INSERT INTO sites (name, url, logo, desc, catelog) VALUES (?, ?, ?, ?, ?)`).bind(config.name, config.url, config.logo, config.desc, config.catelog).run();
      await env.NAV_DB.prepare('DELETE FROM pending_sites WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({
        code: 200,
        message: 'Pending config approved successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return this.errorResponse(`Failed to approve pending config: ${e.message}`, 500);
    }
  },
  async rejectPendingConfig(request, env, ctx, id) {
    try {
      await env.NAV_DB.prepare('DELETE FROM pending_sites WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({
        code: 200,
        message: 'Pending config rejected successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return this.errorResponse(`Failed to reject pending config: ${e.message}`, 500);
    }
  },
  async submitConfig(request, env, ctx) {
    try {
      const config = await request.json();
      const { name, url, logo, desc, catelog } = config;
      if (!name || !url || !catelog) {
        return this.errorResponse('Name, URL, and Catelog are required', 400);
      }
      if (name.length > 100 || url.length > 255 || catelog.length > 50) {
        return this.errorResponse('Input exceeds length limit', 400);
      }
      if (!url.match(/^https?:\/\//)) {
        return this.errorResponse('Invalid URL format', 400);
      }
      await env.NAV_DB.prepare(`INSERT INTO pending_sites (name, url, logo, desc, catelog) VALUES (?, ?, ?, ?, ?)`).bind(name, url, logo, desc, catelog).run();
      return new Response(JSON.stringify({
        code: 201,
        message: 'Config submitted successfully, waiting for admin approval'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return this.errorResponse(`Failed to submit config: ${e.message}`, 500);
    }
  },
  async createConfig(request, env, ctx) {
    try {
      const config = await request.json();
      const { name, url, logo, desc, catelog } = config;
      if (!name || !url || !catelog) {
        return this.errorResponse('Name, URL, and Catelog are required', 400);
      }
      if (name.length > 100 || url.length > 255 || catelog.length > 50) {
        return this.errorResponse('Input exceeds length limit', 400);
      }
      if (!url.match(/^https?:\/\//)) {
        return this.errorResponse('Invalid URL format', 400);
      }
      const insert = await env.NAV_DB.prepare(`INSERT INTO sites (name, url, logo, desc, catelog) VALUES (?, ?, ?, ?, ?)`).bind(name, url, logo, desc, catelog).run();
      return new Response(JSON.stringify({
        code: 201,
        message: 'Config created successfully',
        insert
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return this.errorResponse(`Failed to create config: ${e.message}`, 500);
    }
  },
  async updateConfig(request, env, ctx, id) {
    try {
      const config = await request.json();
      const { name, url, logo, desc, catelog } = config;
      const update = await env.NAV_DB.prepare(`UPDATE sites SET name = ?, url = ?, logo = ?, desc = ?, catelog = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?`).bind(name, url, logo, desc, catelog, id).run();
      return new Response(JSON.stringify({
        code: 200,
        message: 'Config updated successfully',
        update
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return this.errorResponse(`Failed to update config: ${e.message}`, 500);
    }
  },
  async deleteConfig(request, env, ctx, id) {
    try {
      const del = await env.NAV_DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({
        code: 200,
        message: 'Config deleted successfully',
        del
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return this.errorResponse(`Failed to delete config: ${e.message}`, 500);
    }
  },
  async importConfig(request, env, ctx) {
    try {
      const jsonData = await request.json();
      if (!Array.isArray(jsonData)) {
        return this.errorResponse('Invalid JSON data. Must be an array of site configurations.', 400);
      }
      const insertStatements = jsonData.map(item =>
        env.NAV_DB.prepare(`INSERT INTO sites (name, url, logo, desc, catelog) VALUES (?, ?, ?, ?, ?)`).bind(item.name, item.url, item.logo, item.desc, item.catelog)
      );
      await Promise.all(insertStatements.map(stmt => stmt.run()));
      return new Response(JSON.stringify({
        code: 201,
        message: 'Config imported successfully'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return this.errorResponse(`Failed to import config: ${error.message}`, 500);
    }
  },
  async exportConfig(request, env, ctx) {
    try {
      const { results } = await env.NAV_DB.prepare('SELECT * FROM sites ORDER BY create_time DESC').all();
      return new Response(JSON.stringify({
        code: 200,
        data: results
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="config.json"'
        }
      });
    } catch (e) {
      return this.errorResponse(`Failed to export config: ${e.message}`, 500);
    }
  },
  errorResponse(message, status) {
    return new Response(JSON.stringify({ code: status, message: message }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * 处理后台管理页面请求
 * 修改部分开始：从这里开始是修改后的代码
 */
const admin = {
  async handleRequest(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/admin') {
      // 检查是否已登录（通过 Cookie）
      const cookie = request.headers.get('Cookie') || '';
      const isLoggedIn = cookie.includes('loggedIn=true');

      if (request.method === 'POST') {
        // 处理登录表单提交
        const formData = await request.formData();
        const username = formData.get('username') || '';
        const password = formData.get('password') || '';
        const storedUsername = await env.NAV_AUTH.get("admin_username");
        const storedPassword = await env.NAV_AUTH.get("admin_password");

        if (username === storedUsername && password === storedPassword) {
          // 登录成功，设置 Cookie
          const response = await this.renderAdminPage();
          response.headers.set('Set-Cookie', 'loggedIn=true; Path=/admin; HttpOnly; Max-Age=3600');
          return response;
        } else {
          // 登录失败，返回登录页面并显示错误信息
          const loginPage = await this.getFileContent('login.html');
          const errorPage = loginPage.replace('{{errorMessage}}', '用户名或密码错误，请重试');
          return new Response(errorPage, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
      } else if (isLoggedIn) {
        // 已登录，直接渲染管理页面
        return await this.renderAdminPage();
      } else {
        // 未登录，显示登录页面
        const loginPage = await this.getFileContent('login.html');
        const initialPage = loginPage.replace('{{errorMessage}}', '');
        return new Response(initialPage, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }

    if (url.pathname.startsWith('/static')) {
      return this.handleStatic(request, env, ctx);
    }

    return new Response('页面不存在', { status: 404 });
  },
  async handleStatic(request, env, ctx) {
    const url = new URL(request.url);
    const filePath = url.pathname.replace('/static/', '');

    let contentType = 'text/plain';
    if (filePath.endsWith('.css')) {
      contentType = 'text/css';
    } else if (filePath.endsWith('.js')) {
      contentType = 'application/javascript';
    }

    try {
      const fileContent = await this.getFileContent(filePath);
      return new Response(fileContent, {
        headers: { 'Content-Type': contentType }
      });
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  },
  async getFileContent(filePath) {
    const fileContents = {
      'login.html': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>登录 - 书签管理平台</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#f4f1fd',
            100: '#e9e3fb',
            200: '#d3c7f7',
            300: '#b0a0f0',
            400: '#8a70e7',
            500: '#7209b7',
            600: '#6532cc',
            700: '#5429ab',
            800: '#46238d',
            900: '#3b1f75',
            950: '#241245',
          }
        },
        fontFamily: {
          sans: ['Noto Sans SC', 'sans-serif'],
        },
      }
    }
  }
</script>
</head>
<body class="bg-gray-50 min-h-screen flex flex-col font-sans text-gray-800">
<div class="flex-grow flex items-center justify-center px-4">
  <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-primary-600">书签管理平台</h1>
      <p class="text-gray-500 mt-2">请登录以继续</p>
    </div>
    <div id="errorMessage" class="mb-4 text-red-600 text-sm {{errorMessage ? '' : 'hidden'}}">{{errorMessage}}</div>
    <form id="loginForm" action="/admin" method="POST" class="space-y-4">
      <div>
        <label for="username" class="block text-sm font-medium text-gray-700">用户名</label>
        <input type="text" id="username" name="username" required
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
      </div>
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">密码</label>
        <input type="password" id="password" name="password" required
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
      </div>
      <div class="pt-2">
        <button type="submit" id="loginBtn"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
          登录
        </button>
      </div>
    </form>
  </div>
</div>
<footer class="bg-white py-4 px-6 mt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
  © ${new Date().getFullYear()} 拾光集 | 愿你在此找到方向
</footer>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>登录中...';
        try {
          const formData = new FormData(form);
          const res = await fetch(form.action, {
            method: form.method,
            body: formData
          });
          if (res.ok) {
            // 登录成功，页面会重定向或刷新
            window.location.reload();
          } else {
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) {
              errorMessage.classList.remove('hidden');
              errorMessage.innerText = '用户名或密码错误，请重试';
            }
            loginBtn.disabled = false;
            loginBtn.innerHTML = '登录';
          }
        } catch (err) {
          const errorMessage = document.getElementById('errorMessage');
          if (errorMessage) {
            errorMessage.classList.remove('hidden');
            errorMessage.innerText = '发生错误，请重试';
          }
          loginBtn.disabled = false;
          loginBtn.innerHTML = '登录';
        }
      });
    }
  });
</script>
</body>
</html>`,
      'admin.html': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>书签管理平台</title>
<link rel="stylesheet" href="/static/admin.css">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#f4f1fd',
            100: '#e9e3fb',
            200: '#d3c7f7',
            300: '#b0a0f0',
            400: '#8a70e7',
            500: '#7209b7',
            600: '#6532cc',
            700: '#5429ab',
            800: '#46238d',
            900: '#3b1f75',
            950: '#241245',
          },
          secondary: {
            50: '#eef4ff',
            100: '#e0ebff',
            200: '#c7d9ff',
            300: '#a3beff',
            400: '#7a9aff',
            500: '#5a77fb',
            600: '#4361ee',
            700: '#2c4be0',
            800: '#283db6',
            900: '#253690',
            950: '#1a265c',
          },
          accent: {
            50: '#ecfdff',
            100: '#d0f7fe',
            200: '#a9eefe',
            300: '#72e0fd',
            400: '#33cafc',
            500: '#4cc9f0',
            600: '#0689cb',
            700: '#0b6ca6',
            800: '#115887',
            900: '#134971',
            950: '#0c2d48',
          },
        },
        fontFamily: {
          sans: ['Noto Sans SC', 'sans-serif'],
        },
      }
    }
  }
</script>
</head>
<body class="bg-gray-100 font-sans text-gray-800">
<div class="container">
  <header class="header">
    <h1><i class="fas fa-bookmark me-2"></i>书签管理平台</h1>
    <div class="header-actions">
      <a href="/" class="btn btn-outline-primary"><i class="fas fa-home me-1"></i>访问前台</a>
      <button id="logoutBtn" class="btn btn-outline-danger"><i class="fas fa-sign-out-alt me-1"></i>退出登录</button>
    </div>
  </header>
  <div class="card mb-4">
    <div class="card-header"><i class="fas fa-plus-circle me-2"></i>添加新书签</div>
    <div class="card-body">
      <div class="add-new">
        <div class="form-group">
          <input type="text" id="addName" placeholder="网站名称" class="form-control">
        </div>
        <div class="form-group">
          <input type="text" id="addUrl" placeholder="网址" class="form-control">
        </div>
        <div class="form-group">
          <input type="text" id="addLogo" placeholder="Logo（可选）" class="form-control">
        </div>
        <div class="form-group">
          <input type="text" id="addDesc" placeholder="描述（可选）" class="form-control">
        </div>
        <div class="form-group category-wrapper">
          <select id="addCatelog" class="form-control category-select">
            <option value="">选择分类</option>
            <!-- 分类选项将动态加载 -->
          </select>
          <input type="text" id="newCatelog" placeholder="新分类" style="display:none;" class="form-control mt-2">
          <button type="button" id="addNewCatelogBtn" class="btn btn-outline-secondary mt-2"><i class="fas fa-tag me-1"></i>确定</button>
        </div>
        <button id="addBtn" class="btn btn-primary"><i class="fas fa-plus me-1"></i>添加书签</button>
      </div>
    </div>
  </div>
  <div id="message" class="alert d-none mb-4" role="alert"></div>
  <div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div><i class="fas fa-tools me-2"></i>操作工具</div>
      <div class="import-export">
        <input type="file" id="importFile" accept=".json" style="display:none;">
        <button id="importBtn" class="btn btn-outline-success me-2"><i class="fas fa-upload me-1"></i>导入</button>
        <button id="exportBtn" class="btn btn-outline-info"><i class="fas fa-download me-1"></i>导出</button>
      </div>
    </div>
  </div>
  <div class="tab-wrapper card">
    <div class="tab-buttons card-header">
      <button class="tab-button active" data-tab="config"><i class="fas fa-list me-1"></i>书签列表</button>
      <button class="tab-button" data-tab="pending"><i class="fas fa-clock me-1"></i>待审核列表</button>
    </div>
    <div class="card-body">
      <div id="config" class="tab-content active">
        <div class="table-wrapper">
          <div class="loading-spinner d-none" id="configLoading"><i class="fas fa-spinner fa-spin me-1"></i>加载中...</div>
          <table id="configTable" class="table table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>网址</th>
                <th>Logo</th>
                <th>描述</th>
                <th>分类</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="configTableBody">
              <!-- data render by js -->
            </tbody>
          </table>
          <div class="pagination">
            <button id="prevPage" disabled class="btn btn-outline-primary me-2"><i class="fas fa-chevron-left me-1"></i>上一页</button>
            <span id="currentPage">1</span>/<span id="totalPages">1</span>
            <button id="nextPage" disabled class="btn btn-outline-primary ms-2"><i class="fas fa-chevron-right me-1"></i>下一页</button>
          </div>
        </div>
      </div>
      <div id="pending" class="tab-content">
        <div class="table-wrapper">
          <div class="loading-spinner d-none" id="pendingLoading"><i class="fas fa-spinner fa-spin me-1"></i>加载中...</div>
          <table id="pendingTable" class="table table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>网址</th>
                <th>Logo</th>
                <th>描述</th>
                <th>分类</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="pendingTableBody">
              <!-- data render by js -->
            </tbody>
          </table>
          <div class="pagination">
            <button id="pendingPrevPage" disabled class="btn btn-outline-primary me-2"><i class="fas fa-chevron-left me-1"></i>上一页</button>
            <span id="pendingCurrentPage">1</span>/<span id="pendingTotalPages">1</span>
            <button id="pendingNextPage" disabled class="btn btn-outline-primary ms-2"><i class="fas fa-chevron-right me-1"></i>下一页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- 添加与首页相同的 footer -->
<footer class="bg-white py-8 px-6 mt-12 border-t border-gray-200">
  <div class="max-w-5xl mx-auto text-center">
    <p class="text-gray-500">© ${new Date().getFullYear()} 拾光集 | 愿你在此找到方向</p>
    <div class="mt-4 flex justify-center space-x-6">
      <a href="/" target="_blank" class="text-gray-400 hover:text-primary-500 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </a>
    </div>
  </div>
</footer>
<script src="/static/admin.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        document.cookie = 'loggedIn=; Path=/admin; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        window.location.href = '/admin';
      });
    }
  });
</script>
</body>
</html>`,
      'admin.css': `
body {
  font-family: 'Noto Sans SC', sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f7fa;
  color: #333;
  line-height: 1.6;
}
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 15px;
  background: linear-gradient(135deg, #7209b7, #4361ee);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.header h1 {
  margin: 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
}
.header-actions .btn {
  display: inline-flex;
  align-items: center;
  transition: all 0.3s ease;
}
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}
.card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}
.card-header {
  padding: 15px 20px;
  background-color: #fafafa;
  font-weight: 500;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
}
.card-body {
  padding: 20px;
}
.mb-4 {
  margin-bottom: 1.5rem;
}
.add-new {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-control {
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.form-control:focus {
  border-color: #7209b7;
  box-shadow: 0 0 0 0.2rem rgba(114, 9, 183, 0.25);
  outline: none;
}
.btn {
  padding: 10px 16px;
  font-size: 0.95rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-primary {
  background-color: #7209b7;
  color: white;
  border: none;
}
.btn-primary:hover {
  background-color: #5c0a94;
  box-shadow: 0 4px 8px rgba(114, 9, 183, 0.3);
}
.btn-outline-primary {
  border: 1px solid #7209b7;
  color: #7209b7;
  background: transparent;
}
.btn-outline-primary:hover {
  background-color: #7209b7;
  color: white;
}
.btn-outline-secondary {
  border: 1px solid #7209b7;
  color: #7209b7;
  background: transparent;
}
.btn-outline-secondary:hover {
  background-color: #7209b7;
  color: white;
  box-shadow: 0 4px 8px rgba(114, 9, 183, 0.3);
}
.btn-outline-success {
  border: 1px solid #28a745;
  color: #28a745;
}
.btn-outline-success:hover {
  background-color: #28a745;
  color: white;
}
.btn-outline-info {
  border: 1px solid #17a2b8;
  color: #17a2b8;
}
.btn-outline-info:hover {
  background-color: #17a2b8;
  color: white;
}
.btn-outline-danger {
  border: 1px solid #dc3545;
  color: #dc3545;
  background: transparent;
}
.btn-outline-danger:hover {
  background-color: #dc3545;
  color: white;
}
.alert {
  padding: 15px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  animation: fadeIn 0.3s ease;
}
.alert-success {
  background-color: #d4edda;
  color: #155724;
}
.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
}
.d-none {
  display: none;
}
.tab-buttons {
  display: flex;
  gap: 10px;
  background: transparent;
  border-bottom: none;
  padding: 0;
  overflow-x: auto;
}
.tab-button {
  padding: 12px 20px;
  background-color: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.95rem;
  color: #6c757d;
  transition: all 0.3s ease;
  white-space: nowrap;
}
.tab-button.active {
  background-color: transparent;
  color: #7209b7;
  border-bottom: 2px solid #7209b7;
  font-weight: 500;
}
.tab-button:hover:not(.active) {
  color: #343a40;
  border-bottom: 2px solid #ced4da;
}
.tab-content {
  display: none;
}
.tab-content.active {
  display: block;
  animation: fadeIn 0.3s ease;
}
.table-wrapper {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}
.table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}
.table th, .table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}
.table th {
  background-color: #f8f9fa;
  color: #495057;
  font-weight: 500;
}
.table-hover tbody tr:hover {
  background-color: #f8f9fa;
}
.editable input, .editable select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
}
.editable input:disabled, .editable select:disabled {
  background-color: #e9ecef;
  border-color: #ced4da;
  cursor: not-allowed;
}
.pagination {
  text-align: center;
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}
.pagination button:disabled {
  background-color: transparent;
  color: #ced4da;
  cursor: not-allowed;
}
.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 20px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 10px;
  }
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .add-new {
    grid-template-columns: 1fr;
  }
  .tab-buttons {
    justify-content: start;
  }
  .table th, .table td {
    padding: 8px 10px;
    font-size: 0.85rem;
  }
}
@media (max-width: 576px) {
  .header-actions {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .pagination {
    flex-wrap: wrap;
    gap: 5px;
  }
  .pagination button {
    padding: 6px 10px;
    font-size: 0.85rem;
  }
}
`,
      'admin.js': `
      document.addEventListener('DOMContentLoaded', () => {
        const configTableBody = document.getElementById('configTableBody');
        const pendingTableBody = document.getElementById('pendingTableBody');
        const messageDiv = document.getElementById('message');
        const configLoading = document.getElementById('configLoading');
        const pendingLoading = document.getElementById('pendingLoading');
        let configPage = 1;
        let pendingPage = 1;
        const pageSize = 10;
        const catelogSelect = document.getElementById('addCatelog');
        const newCatelogInput = document.getElementById('newCatelog');
        const addNewCatelogBtn = document.getElementById('addNewCatelogBtn');
        const addBtn = document.getElementById('addBtn');
      
        // Remove the configLoading and pendingLoading elements if they exist
        if (configLoading) {
          configLoading.remove();
        }
        if (pendingLoading) {
          pendingLoading.remove();
        }
      
        // Fetch categories and populate dropdown
        async function fetchCategories() {
          try {
            const res = await fetch('/api/categories');
            const data = await res.json();
            if (data.code === 200) {
              catelogSelect.innerHTML = '<option value="">选择分类</option>';
              data.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                catelogSelect.appendChild(option);
              });
              const addNewOption = document.createElement('option');
              addNewOption.value = 'new';
              addNewOption.textContent = data.data.length > 0 ? '添加新分类' : '创建第一个分类';
              catelogSelect.appendChild(addNewOption);
              // 添加提示文本
              let hint = document.querySelector('.category-hint');
              if (!hint) {
                hint = document.createElement('p');
                hint.className = 'category-hint mt-1 text-xs text-gray-500';
                catelogSelect.parentElement.appendChild(hint);
              }
              hint.textContent = data.data.length > 0 ? '选择现有分类或创建新分类' : '目前没有分类，请创建一个新分类';
            } else {
              showMessage('无法加载分类数据', 'error');
            }
          } catch (error) {
            console.error('获取分类时出错:', error);
            showMessage('获取分类时出错', 'error');
          }
        }
      
        // Handle category selection for new bookmark
        if (catelogSelect) {
          catelogSelect.addEventListener('change', () => {
            if (catelogSelect.value === 'new') {
              newCatelogInput.style.display = 'block';
            } else {
              newCatelogInput.style.display = 'none';
            }
          });
        }
      
        // Add new category
        if (addNewCatelogBtn) {
          addNewCatelogBtn.addEventListener('click', () => {
            const newCategory = newCatelogInput.value.trim();
            if (newCategory) {
              const option = document.createElement('option');
              option.value = newCategory;
              option.textContent = newCategory;
              catelogSelect.insertBefore(option, catelogSelect.lastChild);
              catelogSelect.value = newCategory;
              newCatelogInput.value = '';
              newCatelogInput.style.display = 'none';
              showMessage('新分类添加成功', 'success');
            } else {
              showMessage('请输入分类名称', 'error');
            }
          });
        }
      
        // Fetch and render config data
        async function fetchConfig(page) {
          try {
            const res = await fetch('/api/config?page=' + page + '&pageSize=' + pageSize);
            const data = await res.json();
            if (data.code === 200) {
              renderTable(configTableBody, data.data, true);
              updatePagination('config', page, data.total);
            } else {
              showMessage('无法加载书签数据: ' + data.message, 'error');
            }
          } catch (error) {
            console.error('获取书签数据时出错:', error);
            showMessage('获取书签数据时出错: ' + error.message, 'error');
          }
        }
      
        // Fetch and render pending data
        async function fetchPending(page) {
          try {
            const res = await fetch('/api/pending?page=' + page + '&pageSize=' + pageSize);
            const data = await res.json();
            if (data.code === 200) {
              renderTable(pendingTableBody, data.data, false);
              updatePagination('pending', page, data.total);
            } else {
              showMessage('无法加载待审核数据', 'error');
            }
          } catch (error) {
            console.error('获取待审核数据时出错:', error);
            showMessage('获取待审核数据时出错', 'error');
          }
        }
      
        // Render table rows
        function renderTable(tableBody, items, isConfig) {
          if (!tableBody) return;
          tableBody.innerHTML = '';
          if (items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">暂无数据</td></tr>';
            return;
          }
          items.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.id = item.id;
            row.innerHTML = 
              '<td>' + item.id + '</td>' +
              '<td class="editable"><input type="text" value="' + item.name + '" disabled></td>' +
              '<td class="editable"><input type="text" value="' + item.url + '" disabled></td>' +
              '<td class="editable"><input type="text" value="' + (item.logo || '') + '" disabled></td>' +
              '<td class="editable"><input type="text" value="' + (item.desc || '') + '" disabled></td>' +
              '<td class="editable"><select disabled data-original-value="' + item.catelog + '"><option value="' + item.catelog + '">' + item.catelog + '</option></select></td>' +
              '<td>' +
                (isConfig ? 
                  '<button class="edit-btn btn btn-outline-primary btn-sm me-1" data-id="' + item.id + '"><i class="fas fa-edit"></i> 编辑</button>' +
                  '<button class="save-btn btn btn-primary btn-sm me-1" data-id="' + item.id + '" style="display:none;"><i class="fas fa-save"></i> 保存</button>' +
                  '<button class="delete-btn btn btn-outline-danger btn-sm" data-id="' + item.id + '"><i class="fas fa-trash"></i> 删除</button>' 
                  : 
                  '<button class="approve-btn btn btn-outline-success btn-sm me-1" data-id="' + item.id + '"><i class="fas fa-check"></i> 通过</button>' +
                  '<button class="reject-btn btn btn-outline-danger btn-sm" data-id="' + item.id + '"><i class="fas fa-times"></i> 拒绝</button>'
                ) +
              '</td>';
            tableBody.appendChild(row);
            if (isConfig) {
              const select = row.querySelector('select');
              // 动态加载分类选项，保留原始值
              fetchCategories().then(() => {
                const options = Array.from(catelogSelect.options).map(opt => 
                  opt.value !== 'new' ? '<option value="' + opt.value + '" ' + (opt.value === item.catelog ? 'selected' : '') + '>' + opt.text + '</option>' : ''
                ).join('');
                select.innerHTML = options + '<option value="new">添加新分类</option>';
                // 为每个 select 添加一个隐藏的新分类输入框
                let newCatInput = row.querySelector('.new-category-input');
                if (!newCatInput) {
                  newCatInput = document.createElement('input');
                  newCatInput.type = 'text';
                  newCatInput.className = 'new-category-input mt-2 form-control';
                  newCatInput.placeholder = '新分类名称';
                  newCatInput.style.display = 'none';
                  select.parentElement.appendChild(newCatInput);
                }
                // 监听 select 变化以显示/隐藏输入框
                select.addEventListener('change', function() {
                  if (this.value === 'new') {
                    newCatInput.style.display = 'block';
                  } else {
                    newCatInput.style.display = 'none';
                    newCatInput.value = '';
                  }
                });
              });
            }
          });
        }
      
        // Update pagination
        function updatePagination(type, page, total) {
          const prefix = type === 'config' ? '' : 'pending';
          const totalPages = Math.ceil(total / pageSize);
          const currentPageEl = document.getElementById(prefix + 'CurrentPage');
          const totalPagesEl = document.getElementById(prefix + 'TotalPages');
          const prevPageBtn = document.getElementById(prefix + 'PrevPage');
          const nextPageBtn = document.getElementById(prefix + 'NextPage');
          if (currentPageEl) currentPageEl.textContent = page;
          if (totalPagesEl) totalPagesEl.textContent = totalPages;
          if (prevPageBtn) prevPageBtn.disabled = page === 1;
          if (nextPageBtn) nextPageBtn.disabled = page >= totalPages;
          if (type === 'config') configPage = page;
          else pendingPage = page;
        }
      
        // Initial fetch
        fetchCategories();
        fetchConfig(configPage);
        fetchPending(pendingPage);
      
        // Pagination events
        const prevPage = document.getElementById('prevPage');
        if (prevPage) {
          prevPage.addEventListener('click', () => {
            if (configPage > 1) fetchConfig(configPage - 1);
          });
        }
        const nextPage = document.getElementById('nextPage');
        if (nextPage) {
          nextPage.addEventListener('click', () => {
            const totalPages = parseInt(document.getElementById('totalPages')?.textContent || '1');
            if (configPage < totalPages) fetchConfig(configPage + 1);
          });
        }
        const pendingPrevPage = document.getElementById('pendingPrevPage');
        if (pendingPrevPage) {
          pendingPrevPage.addEventListener('click', () => {
            if (pendingPage > 1) fetchPending(pendingPage - 1);
          });
        }
        const pendingNextPage = document.getElementById('pendingNextPage');
        if (pendingNextPage) {
          pendingNextPage.addEventListener('click', () => {
            const totalPages = parseInt(document.getElementById('pendingTotalPages')?.textContent || '1');
            if (pendingPage < totalPages) fetchPending(pendingPage + 1);
          });
        }
      
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
          button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const tabId = button.dataset.tab;
            const tabContent = document.getElementById(tabId);
            if (tabContent) tabContent.classList.add('active');
          });
        });
      
        // Add new config
        if (addBtn) {
          addBtn.addEventListener('click', async () => {
            const name = document.getElementById('addName')?.value.trim() || '';
            const url = document.getElementById('addUrl')?.value.trim() || '';
            const logo = document.getElementById('addLogo')?.value.trim() || '';
            const desc = document.getElementById('addDesc')?.value.trim() || '';
            let catelog = catelogSelect.value;
            if (catelog === 'new') {
              catelog = newCatelogInput.value.trim();
            }
            if (!name || !url || !catelog) {
              showMessage('名称、网址和分类为必填项', 'error');
              return;
            }
            try {
              addBtn.disabled = true;
              addBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>提交中...';
              const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, url, logo, desc, catelog })
              });
              const data = await res.json();
              showMessage(data.message, res.status === 201 ? 'success' : 'error');
              if (res.status === 201) {
                fetchConfig(configPage);
                if (!catelogSelect.querySelector('option[value="' + catelog + '"]') && catelog !== 'new') {
                  const option = document.createElement('option');
                  option.value = catelog;
                  option.textContent = catelog;
                  catelogSelect.insertBefore(option, catelogSelect.lastChild);
                }
                document.getElementById('addName').value = '';
                document.getElementById('addUrl').value = '';
                document.getElementById('addLogo').value = '';
                document.getElementById('addDesc').value = '';
                catelogSelect.value = '';
              }
            } catch (error) {
              console.error('添加书签时出错:', error);
              showMessage('添加书签时出错', 'error');
            } finally {
              addBtn.disabled = false;
              addBtn.innerHTML = '<i class="fas fa-plus me-1"></i>添加书签';
            }
          });
        }
      
        // Edit and delete events
        if (configTableBody) {
          configTableBody.addEventListener('click', async (e) => {
            const id = e.target.dataset.id || e.target.parentElement.dataset.id;
            const row = e.target.closest('tr');
            if (e.target.classList.contains('edit-btn') || e.target.parentElement.classList.contains('edit-btn')) {
              row.querySelectorAll('.editable input, .editable select').forEach(field => field.disabled = false);
              row.querySelector('.edit-btn').style.display = 'none';
              row.querySelector('.save-btn').style.display = 'inline-flex';
            } else if (e.target.classList.contains('save-btn') || e.target.parentElement.classList.contains('save-btn')) {
              const name = row.querySelector('td:nth-child(2) input').value;
              const url = row.querySelector('td:nth-child(3) input').value;
              const logo = row.querySelector('td:nth-child(4) input').value;
              const desc = row.querySelector('td:nth-child(5) input').value;
              const select = row.querySelector('td:nth-child(6) select');
              let catelog = select.value;
              const newCatInput = row.querySelector('.new-category-input');
              
              // 如果选择了“添加新分类”，则使用输入框的值
              if (catelog === 'new') {
                catelog = newCatInput.value.trim();
                if (!catelog) {
                  showMessage('请输入新分类名称', 'error');
                  return;
                }
              }
              
              if (!name || !url || !catelog) {
                showMessage('名称、网址和分类为必填项', 'error');
                return;
              }
              
              try {
                const saveBtn = row.querySelector('.save-btn');
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
                const res = await fetch('/api/config/' + id, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, url, logo, desc, catelog })
                });
                const data = await res.json();
                showMessage(data.message, res.status === 200 ? 'success' : 'error');
                if (res.status === 200) {
                  row.querySelectorAll('.editable input, .editable select').forEach(field => field.disabled = true);
                  row.querySelector('.edit-btn').style.display = 'inline-flex';
                  row.querySelector('.save-btn').style.display = 'none';
                  // 如果是新分类，添加到全局分类选择框
                  if (select.value === 'new' && catelog && !catelogSelect.querySelector('option[value="' + catelog + '"]')) {
                    const option = document.createElement('option');
                    option.value = catelog;
                    option.textContent = catelog;
                    catelogSelect.insertBefore(option, catelogSelect.lastChild);
                  }
                  fetchConfig(configPage);
                }
              } catch (error) {
                console.error('更新书签时出错:', error);
                showMessage('更新书签时出错', 'error');
              } finally {
                const saveBtn = row.querySelector('.save-btn');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> 保存';
              }
            } else if (e.target.classList.contains('delete-btn') || e.target.parentElement.classList.contains('delete-btn')) {
              if (confirm('确定要删除这个书签吗？')) {
                try {
                  const deleteBtn = row.querySelector('.delete-btn');
                  deleteBtn.disabled = true;
                  deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 删除中...';
                  const res = await fetch('/api/config/' + id, { method: 'DELETE' });
                  const data = await res.json();
                  showMessage(data.message, res.status === 200 ? 'success' : 'error');
                  if (res.status === 200) fetchConfig(configPage);
                } catch (error) {
                  console.error('删除书签时出错:', error);
                  showMessage('删除书签时出错', 'error');
                } finally {
                  const deleteBtn = row.querySelector('.delete-btn');
                  deleteBtn.disabled = false;
                  deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 删除';
                }
              }
            }
          });
        }
      
        // Approve and reject events
        if (pendingTableBody) {
          pendingTableBody.addEventListener('click', async (e) => {
            const id = e.target.dataset.id || e.target.parentElement.dataset.id;
            const row = e.target.closest('tr');
            if (e.target.classList.contains('approve-btn') || e.target.parentElement.classList.contains('approve-btn')) {
              try {
                const approveBtn = row.querySelector('.approve-btn');
                approveBtn.disabled = true;
                approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
                const res = await fetch('/api/pending/' + id, { method: 'PUT' });
                const data = await res.json();
                showMessage(data.message, res.status === 200 ? 'success' : 'error');
                if (res.status === 200) {
                  fetchPending(pendingPage);
                  fetchConfig(configPage);
                }
              } catch (error) {
                console.error('通过审核时出错:', error);
                showMessage('通过审核时出错', 'error');
              } finally {
                const approveBtn = row.querySelector('.approve-btn');
                approveBtn.disabled = false;
                approveBtn.innerHTML = '<i class="fas fa-check"></i> 通过';
              }
            } else if (e.target.classList.contains('reject-btn') || e.target.parentElement.classList.contains('reject-btn')) {
              if (confirm('确定要拒绝这个待审核的书签吗？')) {
                try {
                  const rejectBtn = row.querySelector('.reject-btn');
                  rejectBtn.disabled = true;
                  rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
                  const res = await fetch('/api/pending/' + id, { method: 'DELETE' });
                  const data = await res.json();
                  showMessage(data.message, res.status === 200 ? 'success' : 'error');
                  if (res.status === 200) fetchPending(pendingPage);
                } catch (error) {
                  console.error('拒绝审核时出错:', error);
                  showMessage('拒绝审核时出错', 'error');
                } finally {
                  const rejectBtn = row.querySelector('.reject-btn');
                  rejectBtn.disabled = false;
                  rejectBtn.innerHTML = '<i class="fas fa-times"></i> 拒绝';
                }
              }
            }
          });
        }
      
        // Import config
        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
          importBtn.addEventListener('click', () => {
            const importFile = document.getElementById('importFile');
            if (importFile) importFile.click();
          });
        }
        const importFile = document.getElementById('importFile');
        if (importFile) {
          importFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
              try {
                importBtn.disabled = true;
                importBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>导入中...';
                const jsonData = JSON.parse(event.target.result);
                const res = await fetch('/api/config/import', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(jsonData)
                });
                const data = await res.json();
                showMessage(data.message, res.status === 201 ? 'success' : 'error');
                if (res.status === 201) fetchConfig(configPage);
              } catch (error) {
                console.error('导入书签时出错:', error);
                showMessage('导入书签时出错', 'error');
              } finally {
                importBtn.disabled = false;
                importBtn.innerHTML = '<i class="fas fa-upload me-1"></i>导入';
              }
            };
            reader.readAsText(file);
          });
        }
      
        // Export config
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
          exportBtn.addEventListener('click', async () => {
            try {
              exportBtn.disabled = true;
              exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>导出中...';
              const res = await fetch('/api/config/export');
              const data = await res.json();
              if (data.code === 200) {
                const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'config.json';
                a.click();
                URL.revokeObjectURL(url);
                showMessage('导出成功', 'success');
              } else {
                showMessage('导出失败', 'error');
              }
            } catch (error) {
              console.error('导出书签时出错:', error);
              showMessage('导出书签时出错', 'error');
            } finally {
              exportBtn.disabled = false;
              exportBtn.innerHTML = '<i class="fas fa-download me-1"></i>导出';
            }
          });
        }
      
        // Show message
        function showMessage(message, type) {
          if (messageDiv) {
            messageDiv.classList.remove('d-none', 'alert-success', 'alert-danger');
            messageDiv.classList.add(type === 'success' ? 'alert-success' : 'alert-danger');
            messageDiv.innerHTML = type === 'success' ? 
              '<i class="fas fa-check-circle me-2"></i>' + message : 
              '<i class="fas fa-exclamation-circle me-2"></i>' + message;
            setTimeout(() => messageDiv.classList.add('d-none'), 3000);
          }
        }
      });      
`
    };
    return fileContents[filePath] || 'File not found';
  },
  async renderAdminPage() {
    const html = await this.getFileContent('admin.html');
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};
/* 修改部分结束：到这里结束是修改后的代码 */

// 优化后的主逻辑：处理请求，返回优化后的 HTML
async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const catalog = url.searchParams.get('catalog');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  let query = 'SELECT * FROM sites ORDER BY create_time DESC LIMIT ? OFFSET ?';
  let bindParams = [pageSize, offset];
  let countQuery = 'SELECT COUNT(*) as total FROM sites';
  let countBindParams = [];

  if (catalog) {
    query = 'SELECT * FROM sites WHERE catelog = ? ORDER BY create_time DESC LIMIT ? OFFSET ?';
    bindParams = [catalog, pageSize, offset];
    countQuery = 'SELECT COUNT(*) as total FROM sites WHERE catelog = ?';
    countBindParams = [catalog];
  }

  try {
    const { results } = await env.NAV_DB.prepare(query).bind(...bindParams).all();
    const countResult = await env.NAV_DB.prepare(countQuery).bind(...countBindParams).first();
    const total = countResult.total;

    // 单独查询所有分类，确保侧边栏显示所有分类
    const catalogQuery = await env.NAV_DB.prepare('SELECT DISTINCT catelog FROM sites').all();
    const catalogs = catalogQuery.results.map(row => row.catelog).filter(c => c);

    if (results.length === 0) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>错误</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 flex items-center justify-center h-screen">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-gray-800">未找到书签数据</h1>
            <p class="mt-2 text-gray-600">请稍后重试或联系管理员</p>
            <a href="/" class="mt-4 inline-block px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600">返回首页</a>
          </div>
        </body>
        </html>
      `, { status: 404, headers: { 'Content-Type': 'text/html' } });
    }

    const totalPages = Math.ceil(total / pageSize);

    const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>拾光集 - 精品网址导航</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet"/>
      <link rel="icon" href="https://www.wangwangit.com/images/head/a.webp" type="image/webp"/>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = {
          theme: {
            extend: {
              colors: {
                primary: {
                  50: '#f4f1fd',
                  100: '#e9e3fb',
                  200: '#d3c7f7',
                  300: '#b0a0f0',
                  400: '#8a70e7',
                  500: '#7209b7',
                  600: '#6532cc',
                  700: '#5429ab',
                  800: '#46238d',
                  900: '#3b1f75',
                  950: '#241245',
                },
                secondary: {
                  50: '#eef4ff',
                  100: '#e0ebff',
                  200: '#c7d9ff',
                  300: '#a3beff',
                  400: '#7a9aff',
                  500: '#5a77fb',
                  600: '#4361ee',
                  700: '#2c4be0',
                  800: '#283db6',
                  900: '#253690',
                  950: '#1a265c',
                },
                accent: {
                  50: '#ecfdff',
                  100: '#d0f7fe',
                  200: '#a9eefe',
                  300: '#72e0fd',
                  400: '#33cafc',
                  500: '#4cc9f0',
                  600: '#0689cb',
                  700: '#0b6ca6',
                  800: '#115887',
                  900: '#134971',
                  950: '#0c2d48',
                },
              },
              fontFamily: {
                sans: ['Noto Sans SC', 'sans-serif'],
              },
            }
          }
        }
      </script>
      <style>
        /* 自定义滚动条 */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: #d3c7f7;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #7209b7;
        }
        
        /* 卡片悬停效果 */
        .site-card {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .site-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        
        /* 复制成功提示动画 */
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .copy-success-animation {
          animation: fadeInOut 2s ease forwards;
        }
        
        /* 移动端侧边栏 */
        @media (max-width: 768px) {
          .mobile-sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .mobile-sidebar.open {
            transform: translateX(0);
          }
          .mobile-overlay {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }
          .mobile-overlay.open {
            opacity: 1;
            pointer-events: auto;
          }
        }
        
        /* 多行文本截断 */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* 侧边栏控制 */
        #sidebar-toggle {
          display: none;
        }
        
        @media (min-width: 769px) {
          #sidebar-toggle:checked ~ .sidebar {
            margin-left: -16rem;
          }
          #sidebar-toggle:checked ~ .main-content {
            margin-left: 0;
          }
        }
      </style>
    </head>
    <body class="bg-gray-50 font-sans text-gray-800">
      <!-- 侧边栏开关 -->
      <input type="checkbox" id="sidebar-toggle" class="hidden">
      
      <!-- 移动端导航按钮 -->
      <div class="fixed top-4 left-4 z-50 lg:hidden">
        <button id="sidebarToggle" class="p-2 rounded-lg bg-white shadow-md hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      <!-- 移动端遮罩层 - 只在移动端显示 -->
      <div id="mobileOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 mobile-overlay lg:hidden"></div>
      
      <!-- 桌面侧边栏开关按钮 -->
      <div class="fixed top-4 left-4 z-50 hidden lg:block">
        <label for="sidebar-toggle" class="p-2 rounded-lg bg-white shadow-md hover:bg-gray-100 inline-block cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
      </div>
      
      <!-- 侧边栏导航 -->
      <aside id="sidebar" class="sidebar fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 overflow-y-auto mobile-sidebar lg:transform-none transition-all duration-300">
        <div class="p-6">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-bold text-primary-500">拾光集</h2>
            <button id="closeSidebar" class="p-1 rounded-full hover:bg-gray-100 lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <label for="sidebar-toggle" class="p-1 rounded-full hover:bg-gray-100 hidden lg:block cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </label>
          </div>
          
          <div class="mb-6">
            <div class="relative">
              <input id="searchInput" type="text" placeholder="搜索书签..." class="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div>
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">分类导航</h3>
            <div class="space-y-1">
              <a href="?" class="flex items-center px-3 py-2 rounded-lg ${!catalog ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'} w-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 ${!catalog ? 'text-primary-500' : 'text-gray-400'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                全部
              </a>
              ${catalogs.map(cat => `
                <a href="?catalog=${cat}" class="flex items-center px-3 py-2 rounded-lg ${cat === catalog ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'} w-full">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 ${cat === catalog ? 'text-primary-500' : 'text-gray-400'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  ${cat}
                </a>
              `).join('')}
            </div>
          </div>
          
          <div class="mt-8 pt-6 border-t border-gray-200">
            <button id="addSiteBtnSidebar" class="w-full flex items-center justify-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              添加新书签
            </button>
            
            <a href="https://www.wangwangit.com/" target="_blank" class="mt-4 flex items-center px-4 py-2 text-gray-600 hover:text-primary-500 transition duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              访问博客
            </a>

            <a href="/admin" target="_blank" class="mt-4 flex items-center px-4 py-2 text-gray-600 hover:text-primary-500 transition duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              后台管理
            </a>
          </div>
        </div>
      </aside>
      
      <!-- 主内容区 -->
      <main class="main-content lg:ml-64 min-h-screen transition-all duration-300">
        <!-- 顶部横幅 -->
        <header class="bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 text-white py-8 px-6 md:px-10">
          <div class="max-w-5xl mx-auto">
            <div class="flex flex-col md:flex-row items-center justify-center">
              <div class="text-center">
                <h1 class="text-3xl md:text-4xl font-bold mb-2">拾光集</h1>
                <p class="text-primary-100 max-w-xl">分享优质网站，构建更美好的网络世界</p>
              </div>
            </div>
          </div>
        </header>
        
        <!-- 网站列表 -->
        <section class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <!-- 当前分类/搜索提示 -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-800">
              ${catalog ? `${catalog} · ${results.length} 个网站` : `全部收藏 · ${total} 个网站`}
            </h2>
            <div class="text-sm text-gray-500 hidden md:block">
              <script>
                 fetch('https://v1.hitokoto.cn')
                      .then(response => response.json())
                      .then(data => {
                       const hitokoto = document.getElementById('hitokoto_text')
                      if (hitokoto) {
                        hitokoto.href = 'https://hitokoto.cn/?uuid=' + data.uuid
                        hitokoto.innerText = data.hitokoto
                      }
                      })
                      .catch(console.error)
              </script>
              <div id="hitokoto"><a href="#" target="_blank" id="hitokoto_text">疏影横斜水清浅，暗香浮动月黄昏。</a></div>
            </div>
          </div>
          
          <!-- 网站卡片网格 -->
          <div id="sitesGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            ${results.map(site => `
              <div class="site-card group bg-white rounded-xl shadow hover:shadow-lg overflow-hidden" data-id="${site.id}" data-name="${site.name}" data-url="${site.url}" data-catalog="${site.catelog}">
                <div class="p-5">
                  <a href="${site.url}" target="_blank" class="block">
                    <div class="flex items-start">
                      <div class="flex-shrink-0 mr-4">
                        ${site.logo 
                          ? `<img src="${site.logo}" alt="${site.name}" class="w-10 h-10 rounded-lg object-cover">`
                          : `<div class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center text-white font-bold text-lg">${site.name.charAt(0)}</div>`
                        }
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="text-base font-medium text-gray-900 truncate">${site.name}</h3>
                        <span class="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          ${site.catelog}
                        </span>
                      </div>
                    </div>
                    
                    <p class="mt-2 text-sm text-gray-500 line-clamp-2" title="${site.desc || '暂无描述'}">${site.desc || '暂无描述'}</p>
                  </a>
                  
                  <div class="mt-3 flex items-center justify-between">
                    <span class="text-xs text-gray-500 truncate max-w-[140px]">${site.url}</span>
                    <button class="copy-btn flex items-center px-2 py-1 bg-primary-100 text-primary-600 hover:bg-primary-200 rounded-full text-xs font-medium transition-colors" data-url="${site.url}">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      复制
                      <span class="copy-success hidden absolute -top-8 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-md">已复制!</span>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <!-- 分页控件 -->
          <div class="pagination mt-6 flex justify-center gap-4">
            <a href="?catalog=${catalog || ''}&page=${page > 1 ? page - 1 : 1}" class="px-4 py-2 rounded bg-primary-500 text-white ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'}">上一页</a>
            <span>第 ${page} 页 / 共 ${totalPages} 页</span>
            <a href="?catalog=${catalog || ''}&page=${page < totalPages ? page + 1 : totalPages}" class="px-4 py-2 rounded bg-primary-500 text-white ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'}">下一页</a>
          </div>
        </section>
        
        <!-- 页脚 -->
        <footer class="bg-white py-8 px-6 mt-12 border-t border-gray-200">
          <div class="max-w-5xl mx-auto text-center">
            <p class="text-gray-500">© ${new Date().getFullYear()} 拾光集 | 愿你在此找到方向</p>
            <div class="mt-4 flex justify-center space-x-6">
              <a href="/" class="text-gray-400 hover:text-primary-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </main>
      
      <!-- 返回顶部按钮 -->
      <button id="backToTop" class="fixed bottom-8 right-8 p-3 rounded-full bg-primary-500 text-white shadow-lg opacity-0 invisible transition-all duration-300 hover:bg-primary-600">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
        </svg>
      </button>
      
      // 在 handleRequest 函数中，修改添加网站模态框部分
<!-- 添加网站模态框 -->
<div id="addSiteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 opacity-0 invisible transition-all duration-300">
  <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform translate-y-8 transition-all duration-300">
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">添加新书签</h2>
        <button id="closeModal" class="text-gray-400 hover:text-gray-500">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form id="addSiteForm" class="space-y-4">
        <div>
          <label for="addSiteName" class="block text-sm font-medium text-gray-700">名称</label>
          <input type="text" id="addSiteName" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
        </div>
        
        <div>
          <label for="addSiteUrl" class="block text-sm font-medium text-gray-700">网址</label>
          <input type="text" id="addSiteUrl" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
        </div>
        
        <div>
          <label for="addSiteLogo" class="block text-sm font-medium text-gray-700">Logo (可选)</label>
          <input type="text" id="addSiteLogo" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
        </div>
        
        <div>
          <label for="addSiteDesc" class="block text-sm font-medium text-gray-700">描述 (可选)</label>
          <textarea id="addSiteDesc" rows="2" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"></textarea>
        </div>
        
        <div>
          <label for="addSiteCatelog" class="block text-sm font-medium text-gray-700">分类</label>
          <select id="addSiteCatelog" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
            <option value="">选择分类</option>
            ${catalogs.length > 0 ? catalogs.map(cat => `<option value="${cat}">${cat}</option>`).join('') : ''}
            <option value="new">${catalogs.length > 0 ? '添加新分类' : '创建第一个分类'}</option>
          </select>
          <input type="text" id="newSiteCatelog" placeholder="${catalogs.length > 0 ? '新分类名称' : '请输入第一个分类名称'}" style="display:none;" class="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
          <p class="mt-1 text-xs text-gray-500">${catalogs.length > 0 ? '选择现有分类或创建新分类' : '目前没有分类，请创建一个新分类'}</p>
        </div>
        
        <div class="flex justify-end pt-4">
          <button type="button" id="cancelAddSite" class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mr-3">
            取消
          </button>
          <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            提交
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

      
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          // 侧边栏控制
          const sidebar = document.getElementById('sidebar');
          const mobileOverlay = document.getElementById('mobileOverlay');
          const sidebarToggle = document.getElementById('sidebarToggle');
          const closeSidebar = document.getElementById('closeSidebar');
          
          function openSidebar() {
            sidebar.classList.add('open');
            mobileOverlay.classList.add('open');
            document.body.style.overflow = 'hidden';
          }
          
          function closeSidebarMenu() {
            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('open');
            document.body.style.overflow = '';
          }
          
          sidebarToggle.addEventListener('click', openSidebar);
          closeSidebar.addEventListener('click', closeSidebarMenu);
          mobileOverlay.addEventListener('click', closeSidebarMenu);
          
          // 复制链接功能
          document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              const url = this.getAttribute('data-url');
              navigator.clipboard.writeText(url).then(() => {
                const successMsg = this.querySelector('.copy-success');
                successMsg.classList.remove('hidden');
                successMsg.classList.add('copy-success-animation');
                setTimeout(() => {
                  successMsg.classList.add('hidden');
                  successMsg.classList.remove('copy-success-animation');
                }, 2000);
              }).catch(err => {
                console.error('复制失败:', err);
                const textarea = document.createElement('textarea');
                textarea.value = url;
                textarea.style.position = 'fixed';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                try {
                  document.execCommand('copy');
                  const successMsg = this.querySelector('.copy-success');
                  successMsg.classList.remove('hidden');
                  successMsg.classList.add('copy-success-animation');
                  setTimeout(() => {
                    successMsg.classList.add('hidden');
                    successMsg.classList.remove('copy-success-animation');
                  }, 2000);
                } catch (e) {
                  console.error('备用复制也失败了:', e);
                  alert('复制失败，请手动复制');
                }
                document.body.removeChild(textarea);
              });
            });
          });
          
          // 返回顶部按钮
          const backToTop = document.getElementById('backToTop');
          
          window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
              backToTop.classList.remove('opacity-0', 'invisible');
            } else {
              backToTop.classList.add('opacity-0', 'invisible');
            }
          });
          
          backToTop.addEventListener('click', function() {
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          });
          
          // 添加网站模态框
          const addSiteModal = document.getElementById('addSiteModal');
          const addSiteBtnSidebar = document.getElementById('addSiteBtnSidebar');
          const closeModalBtn = document.getElementById('closeModal');
          const cancelAddSite = document.getElementById('cancelAddSite');
          const addSiteForm = document.getElementById('addSiteForm');
          const addSiteCatelog = document.getElementById('addSiteCatelog');
          const newSiteCatelog = document.getElementById('newSiteCatelog');
          
          if (addSiteCatelog) {
            addSiteCatelog.addEventListener('change', function() {
              if (this.value === 'new') {
                newSiteCatelog.style.display = 'block';
              } else {
                newSiteCatelog.style.display = 'none';
              }
            });
          }
          
          function openModal() {
            addSiteModal.classList.remove('opacity-0', 'invisible');
            const modalContent = addSiteModal.querySelector('.max-w-md');
            modalContent.classList.remove('translate-y-8');
            document.body.style.overflow = 'hidden';
          }
          
          function closeModal() {
            addSiteModal.classList.add('opacity-0', 'invisible');
            const modalContent = addSiteModal.querySelector('.max-w-md');
            modalContent.classList.add('translate-y-8');
            document.body.style.overflow = '';
          }
          
          addSiteBtnSidebar.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openModal();
          });
          
          closeModalBtn.addEventListener('click', closeModal);
          cancelAddSite.addEventListener('click', closeModal);
          addSiteModal.addEventListener('click', function(e) {
            if (e.target === addSiteModal) closeModal();
          });
          
          // 表单提交处理
          addSiteForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('addSiteName').value;
            const url = document.getElementById('addSiteUrl').value;
            const logo = document.getElementById('addSiteLogo').value;
            const desc = document.getElementById('addSiteDesc').value;
            let catelog = addSiteCatelog.value;
            if (catelog === 'new') {
              catelog = newSiteCatelog.value.trim();
            }
            
            if (!name || !url || !catelog) {
              alert('名称、网址和分类为必填项');
              return;
            }
            
            fetch('/api/config/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, url, logo, desc, catelog })
            })
            .then(res => res.json())
            .then(data => {
              if (data.code === 201) {
                const successDiv = document.createElement('div');
                successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in';
                successDiv.textContent = '提交成功，等待管理员审核';
                document.body.appendChild(successDiv);
                setTimeout(() => {
                  successDiv.classList.add('opacity-0');
                  setTimeout(() => document.body.removeChild(successDiv), 300);
                }, 2500);
                closeModal();
                addSiteForm.reset();
                newSiteCatelog.style.display = 'none';
              } else {
                alert(data.message || '提交失败');
              }
            })
            .catch(err => {
              console.error('网络错误:', err);
              alert('网络错误，请稍后重试');
            });
          });
          
          // 搜索功能
          const searchInput = document.getElementById('searchInput');
          const sitesGrid = document.getElementById('sitesGrid');
          
          searchInput.addEventListener('input', async function() {
            const keyword = this.value.trim();
            const response = await fetch(\`/api/config?keyword=\${encodeURIComponent(keyword)}&page=1&pageSize=50\`);
            const data = await response.json();
            if (data.code === 200) {
              sitesGrid.innerHTML = data.data.map(site => \`
                <div class="site-card group bg-white rounded-xl shadow hover:shadow-lg overflow-hidden" data-id="\${site.id}" data-name="\${site.name}" data-url="\${site.url}" data-catalog="\${site.catelog}">
                  <div class="p-5">
                    <a href="\${site.url}" target="_blank" class="block">
                      <div class="flex items-start">
                        <div class="flex-shrink-0 mr-4">
                          \${site.logo 
                            ? \`<img src="\${site.logo}" alt="\${site.name}" class="w-10 h-10 rounded-lg object-cover">\`
                            : \`<div class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center text-white font-bold text-lg">\${site.name.charAt(0)}</div>\`
                          }
                        </div>
                        <div class="flex-1 min-w-0">
                          <h3 class="text-base font-medium text-gray-900 truncate">\${site.name}</h3>
                          <span class="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">\${site.catelog}</span>
                        </div>
                      </div>
                      <p class="mt-2 text-sm text-gray-500 line-clamp-2" title="\${site.desc || '暂无描述'}">\${site.desc || '暂无描述'}</p>
                    </a>
                    <div class="mt-3 flex items-center justify-between">
                      <span class="text-xs text-gray-500 truncate max-w-[140px]">\${site.url}</span>
                      <button class="copy-btn flex items-center px-2 py-1 bg-primary-100 text-primary-600 hover:bg-primary-200 rounded-full text-xs font-medium transition-colors" data-url="\${site.url}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        复制
                        <span class="copy-success hidden absolute -top-8 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-md">已复制!</span>
                      </button>
                    </div>
                  </div>
                </div>
              \`).join('');
              const h2Element = document.querySelector('h2');
              if (h2Element) {
                h2Element.textContent = keyword ? \`搜索结果 · \${data.data.length} 个网站\` : 
                  (${catalog ? `\`${catalog} · ${results.length} 个网站\`` : `\`全部收藏 · ${total} 个网站\``});
              }
            }
          });
        });
      </script>
    </body>
    </html>
    `;

    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  } catch (e) {
    return new Response(`Failed to fetch data: ${e.message}`, { status: 500 });
  }
}
// 导出主模块
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith('/api')) {
      return api.handleRequest(request, env, ctx);
    } else if (url.pathname === '/admin' || url.pathname.startsWith('/static')) {
      return admin.handleRequest(request, env, ctx);
    } else {
      return handleRequest(request, env, ctx);
    }
  },
};
