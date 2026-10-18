// Mock data for admin panel prototype
const names = ['Andi Pratama', 'Siti Rahayu', 'Budi Santoso', 'Dewi Lestari', 'Rizki Hidayat', 'Putri Amelia', 'Agus Setiawan', 'Maya Sari', 'Doni Kusuma', 'Lina Wati', 'Fajar Nugroho', 'Rina Oktavia', 'Hendra Wijaya', 'Nita Permata', 'Yoga Aditya', 'Citra Dewi', 'Wahyu Firmansyah', 'Eka Putri', 'Bayu Pratama', 'Sari Indah', 'Reza Maulana', 'Dian Safitri', 'Fikri Rahman', 'Ayu Lestari', 'Toni Sugiarto', 'Mira Anggraeni', 'Joko Widodo', 'Ratna Sari', 'Ilham Akbar', 'Nadia Kusuma', 'Arif Budiman', 'Wulan Dari', 'Dimas Prasetyo', 'Fitri Handayani', 'Galih Purnama', 'Indri Wahyuni', 'Krisna Murti', 'Lusi Andriani', 'Muhamad Ridwan', 'Novita Sari', 'Oscar Tanaka', 'Puspita Dewi', 'Qadir Hakim', 'Rini Sulistyowati', 'Surya Dharma', 'Tuti Wulandari', 'Umar Faruq', 'Vina Melati', 'Wawan Hermawan', 'Xena Putri'];
const cities = ['Tangerang', 'Jakarta Selatan', 'Bandung', 'Surabaya', 'Bekasi', 'Depok', 'Bogor', 'Semarang', 'Yogyakarta', 'Malang'];
const districts = ['Ciledug', 'BSD', 'Serpong', 'Karawaci', 'Cikupa', 'Bintaro', 'Pondok Indah', 'Kelapa Gading', 'Kemang', 'Menteng'];
const products = ['Steak Sapi', 'Kopi Artisan', 'Bakso Premium', 'Ayam Geprek', 'Es Teh Kekinian', 'Burger Gourmet', 'Dimsum', 'Sate Kambing', 'Roti Artisan', 'Dessert Box'];
const categories = ['Makanan & Minuman', 'Fashion', 'Kesehatan', 'Teknologi', 'Jasa', 'Pendidikan', 'Retail', 'Properti'];
const plans = ['free', 'free', 'free', 'starter', 'starter', 'pro'] as const;

function randomDate(daysBack: number) {
  return new Date(Date.now() - Math.random() * daysBack * 86400000);
}

function randomEl<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface MockUser {
  id: string;
  full_name: string;
  email: string;
  plan: string;
  credits_remaining: number;
  created_at: string;
  business_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  total_analyses: number;
  total_spend: number;
}

export interface MockProject {
  id: string;
  user_id: string;
  user_name: string;
  project_name: string;
  product_name: string;
  product_category: string;
  city: string;
  districts: string[];
  status: string;
  score: number | null;
  created_at: string;
}

export interface MockTransaction {
  id: string;
  user_id: string;
  user_name: string;
  transaction_type: 'topup' | 'usage' | 'refund' | 'bonus' | 'expired';
  amount: number;
  credit_before: number;
  credit_after: number;
  description: string;
  payment_method: string;
  payment_reference: string | null;
  payment_status: 'completed' | 'pending' | 'failed' | 'refunded';
  created_at: string;
}

export interface MockAuditLog {
  id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

// Generate stable mock data
let _users: MockUser[] | null = null;
let _projects: MockProject[] | null = null;
let _transactions: MockTransaction[] | null = null;
let _auditLogs: MockAuditLog[] | null = null;

export function getMockUsers(): MockUser[] {
  if (_users) return _users;
  _users = Array.from({ length: 50 }, (_, i) => {
    const plan = randomEl(plans);
    return {
      id: `user-${String(i + 1).padStart(3, '0')}`,
      full_name: names[i],
      email: `${names[i].toLowerCase().replace(/\s/g, '.')}@example.com`,
      plan,
      credits_remaining: plan === 'pro' ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 15),
      created_at: randomDate(90).toISOString(),
      business_name: Math.random() > 0.4 ? `${names[i].split(' ')[0]} Enterprise` : null,
      phone: Math.random() > 0.3 ? `+628${Math.floor(Math.random() * 900000000 + 100000000)}` : null,
      avatar_url: null,
      is_active: Math.random() > 0.1,
      total_analyses: Math.floor(Math.random() * 20),
      total_spend: plan === 'free' ? 0 : plan === 'starter' ? 99000 * Math.ceil(Math.random() * 3) : 299000 * Math.ceil(Math.random() * 5),
    };
  });
  return _users;
}

export function getMockProjects(): MockProject[] {
  if (_projects) return _projects;
  const users = getMockUsers();
  const statuses = ['completed', 'completed', 'completed', 'draft', 'analyzing'];
  _projects = Array.from({ length: 120 }, (_, i) => {
    const user = randomEl(users);
    const product = randomEl(products);
    const city = randomEl(cities);
    const district = randomEl(districts);
    const status = randomEl(statuses);
    return {
      id: `proj-${String(i + 1).padStart(3, '0')}`,
      user_id: user.id,
      user_name: user.full_name,
      project_name: `Analisis ${product} - ${district}`,
      product_name: product,
      product_category: randomEl(categories),
      city,
      districts: [district, ...(Math.random() > 0.5 ? [randomEl(districts)] : [])],
      status,
      score: status === 'completed' ? Math.round((Math.random() * 30 + 65) * 10) / 10 : null,
      created_at: randomDate(60).toISOString(),
    };
  });
  return _projects;
}

export function getMockTransactions(): MockTransaction[] {
  if (_transactions) return _transactions;
  const users = getMockUsers();
  const types: MockTransaction['transaction_type'][] = ['topup', 'topup', 'usage', 'usage', 'usage', 'bonus'];
  const methods = ['midtrans', 'manual_transfer', 'free_trial', 'admin_grant'];
  const payStatuses: MockTransaction['payment_status'][] = ['completed', 'completed', 'completed', 'pending'];
  _transactions = Array.from({ length: 80 }, (_, i) => {
    const user = randomEl(users);
    const type = randomEl(types);
    const amount = type === 'topup' ? 15 : type === 'usage' ? -1 : 5;
    const creditBefore = Math.floor(Math.random() * 20) + 5;
    return {
      id: `txn-${String(i + 1).padStart(3, '0')}`,
      user_id: user.id,
      user_name: user.full_name,
      transaction_type: type,
      amount,
      credit_before: creditBefore,
      credit_after: creditBefore + amount,
      description: type === 'topup' ? 'Top-up Starter Plan' : type === 'usage' ? `Analisis: ${randomEl(products)} - ${randomEl(districts)}` : 'Bonus promo pendaftaran',
      payment_method: randomEl(methods),
      payment_reference: Math.random() > 0.5 ? `PAY-${Math.random().toString(36).substr(2, 8).toUpperCase()}` : null,
      payment_status: randomEl(payStatuses),
      created_at: randomDate(30).toISOString(),
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return _transactions;
}

export function getMockAuditLogs(): MockAuditLog[] {
  if (_auditLogs) return _auditLogs;
  const actions = ['update_config', 'grant_credit', 'change_plan', 'refund', 'delete_project', 'create_user'];
  const targetTypes = ['user', 'config', 'transaction', 'project'];
  _auditLogs = Array.from({ length: 30 }, (_, i) => ({
    id: `log-${String(i + 1).padStart(3, '0')}`,
    admin_name: 'Admin Utama',
    action: randomEl(actions),
    target_type: randomEl(targetTypes),
    target_id: `target-${Math.floor(Math.random() * 50)}`,
    details: { before: { value: 'old' }, after: { value: 'new' } },
    ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
    created_at: randomDate(30).toISOString(),
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return _auditLogs;
}

// Stats helpers
export function getAdminStats() {
  const users = getMockUsers();
  const projects = getMockProjects();
  const transactions = getMockTransactions();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const newUsersThisWeek = users.filter(u => new Date(u.created_at) > weekAgo).length;
  const activeUsers = users.filter(u => {
    const userProjects = projects.filter(p => p.user_id === u.id);
    return userProjects.some(p => new Date(p.created_at) > monthAgo);
  }).length;
  const completedAnalyses = projects.filter(p => p.status === 'completed').length;
  const topupTransactions = transactions.filter(t => t.transaction_type === 'topup' && t.payment_status === 'completed').length;
  const revenueThisMonth = users.filter(u => u.plan !== 'free').reduce((sum, u) => sum + (u.plan === 'starter' ? 99000 : 299000), 0);
  const pendingTransactions = transactions.filter(t => t.payment_status === 'pending').length;

  const planDist = {
    free: users.filter(u => u.plan === 'free').length,
    starter: users.filter(u => u.plan === 'starter').length,
    pro: users.filter(u => u.plan === 'pro').length,
  };

  // Daily registrations for 30 days
  const dailyRegistrations = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(now.getTime() - (29 - i) * 86400000);
    const dayStr = day.toISOString().split('T')[0];
    const count = users.filter(u => u.created_at.startsWith(dayStr)).length;
    return { date: dayStr, count, cumulative: 0 };
  });
  let cum = users.filter(u => new Date(u.created_at) <= new Date(dailyRegistrations[0]?.date || '')).length;
  dailyRegistrations.forEach(d => { cum += d.count; d.cumulative = cum; });

  // Category distribution
  const categoryDist = categories.map(c => ({
    name: c,
    count: projects.filter(p => p.product_category === c).length,
  })).sort((a, b) => b.count - a.count).slice(0, 10);

  // City distribution
  const cityDist = cities.map(c => ({
    name: c,
    count: projects.filter(p => p.city === c).length,
  })).sort((a, b) => b.count - a.count).slice(0, 10);

  return {
    totalUsers: users.length,
    newUsersThisWeek,
    activeUsers,
    topupTransactions,
    revenueThisMonth,
    completedAnalyses,
    pendingTransactions,
    planDist,
    dailyRegistrations,
    categoryDist,
    cityDist,
  };
}
