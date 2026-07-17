require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const { Role, Permission } = require('./src/models/Role');
const Branch = require('./src/models/Branch');

const MODULES = ['inventory', 'purchase', 'pos', 'reports', 'users', 'settings'];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'];

// Role definitions: name -> array of { module, actions[] }
const ROLE_DEFINITIONS = {
  Owner: {
    isSystem: true,
    perms: 'ALL',
  },
  Admin: {
    isSystem: true,
    perms: [
      { module: 'inventory', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'] },
      { module: 'purchase',  actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'] },
      { module: 'pos',       actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'] },
      { module: 'reports',   actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'] },
      { module: 'users',     actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'settings',  actions: ['view', 'create', 'edit', 'delete', 'export', 'print'] },
    ],
  },
  Manager: {
    perms: [
      { module: 'inventory', actions: ['view', 'create', 'edit', 'approve', 'export', 'print'] },
      { module: 'purchase',  actions: ['view', 'create', 'edit', 'approve', 'export', 'print'] },
      { module: 'pos',       actions: ['view', 'create', 'edit', 'approve', 'print'] },
      { module: 'reports',   actions: ['view', 'export'] },
      { module: 'users',     actions: ['view'] },
      { module: 'settings',  actions: ['view', 'edit'] },
    ],
  },
  'Stock Manager': {
    perms: [
      { module: 'inventory', actions: ['view', 'create', 'edit', 'approve', 'export', 'print'] },
      { module: 'purchase',  actions: ['view'] },
      { module: 'reports',   actions: ['view'] },
    ],
  },
  'Purchase Manager': {
    perms: [
      { module: 'purchase',  actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'] },
      { module: 'inventory', actions: ['view'] },
      { module: 'reports',   actions: ['view', 'export'] },
    ],
  },
  Cashier: {
    perms: [
      { module: 'pos',       actions: ['view', 'create', 'print'] },
      { module: 'inventory', actions: ['view'] },
      { module: 'reports',   actions: ['view'] },
    ],
  },
  Accountant: {
    perms: [
      { module: 'reports',   actions: ['view', 'export'] },
      { module: 'purchase',  actions: ['view', 'export'] },
      { module: 'pos',       actions: ['view', 'export'] },
      { module: 'inventory', actions: ['view'] },
      { module: 'settings',  actions: ['view'] },
    ],
  },
  'Warehouse Staff': {
    perms: [
      { module: 'inventory', actions: ['view', 'create', 'edit'] },
      { module: 'purchase',  actions: ['view'] },
    ],
  },
  'Delivery Boy': {
    perms: [
      { module: 'inventory', actions: ['view'] },
      { module: 'pos',       actions: ['view'] },
    ],
  },
  Auditor: {
    perms: [
      { module: 'inventory', actions: ['view', 'export'] },
      { module: 'purchase',  actions: ['view', 'export'] },
      { module: 'pos',       actions: ['view', 'export'] },
      { module: 'reports',   actions: ['view', 'export'] },
      { module: 'users',     actions: ['view'] },
      { module: 'settings',  actions: ['view'] },
    ],
  },
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Create all permissions
  const permMap = {};
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const perm = await Permission.findOneAndUpdate(
        { module, action },
        { module, action },
        { upsert: true, new: true }
      );
      permMap[`${module}:${action}`] = perm._id;
    }
  }
  const allPermIds = Object.values(permMap);
  console.log(`✅ ${allPermIds.length} permissions created`);

  // Create all roles
  for (const [roleName, def] of Object.entries(ROLE_DEFINITIONS)) {
    let permIds;
    if (def.perms === 'ALL') {
      permIds = allPermIds;
    } else {
      permIds = def.perms.flatMap(({ module, actions }) =>
        actions.map(action => permMap[`${module}:${action}`]).filter(Boolean)
      );
    }
    await Role.findOneAndUpdate(
      { name: roleName },
      { name: roleName, permissions: permIds, isSystem: def.isSystem || false },
      { upsert: true, new: true }
    );
    console.log(`✅ Role: ${roleName} (${permIds.length} permissions)`);
  }

  // Create default branch
  let defaultBranch = await Branch.findOne({ code: 'MAIN' });
  if (!defaultBranch) {
    defaultBranch = await Branch.create({
      name: 'Main Branch',
      code: 'MAIN',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '9999999999',
      email: 'main@inventory.com',
      status: 'active',
    });
    console.log('✅ Default branch created: Main Branch (MAIN)');
  } else {
    console.log('ℹ️  Default branch already exists');
  }

  // Create admin user
  const ownerRole = await Role.findOne({ name: 'Owner' });
  const existing = await User.findOne({ username: 'admin' });
  if (!existing) {
    await User.create({
      name: 'Administrator',
      email: 'admin@inventory.com',
      mobile: '9999999999',
      username: 'admin',
      password: 'Admin@123',
      role: ownerRole._id,
      status: 'active',
      // Admin has no branch — can access all branches
    });
    console.log('✅ Admin user created');
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  // Create demo users for each role
  const demoUsers = [
    { name: 'Store Manager', username: 'manager', role: 'Manager', email: 'manager@inventory.com' },
    { name: 'Head Cashier', username: 'cashier', role: 'Cashier', email: 'cashier@inventory.com' },
    { name: 'Stock Manager', username: 'stockmgr', role: 'Stock Manager', email: 'stock@inventory.com' },
    { name: 'Purchase Manager', username: 'purchasemgr', role: 'Purchase Manager', email: 'purchase@inventory.com' },
    { name: 'Accountant', username: 'accountant', role: 'Accountant', email: 'accountant@inventory.com' },
    { name: 'Auditor', username: 'auditor', role: 'Auditor', email: 'auditor@inventory.com' },
  ];

  for (const u of demoUsers) {
    const role = await Role.findOne({ name: u.role });
    const exists = await User.findOne({ username: u.username });
    if (!exists && role) {
      await User.create({
        name: u.name,
        email: u.email,
        mobile: '9999999999',
        username: u.username,
        password: 'Demo@123',
        role: role._id,
        status: 'active',
      });
      console.log(`✅ Demo user: ${u.username} (${u.role})`);
    }
  }

  console.log('\n--- Login Credentials ---');
  console.log('Admin    : admin / Admin@123');
  console.log('Manager  : manager / Demo@123');
  console.log('Cashier  : cashier / Demo@123');
  console.log('Stock    : stockmgr / Demo@123');
  console.log('Purchase : purchasemgr / Demo@123');
  console.log('-------------------------');
  console.log('Default Branch: Main Branch (MAIN)\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
