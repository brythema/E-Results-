import React, { useState, useEffect } from 'react';
import { School } from '../../types';
import { dbService } from '../../services/dbService';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Building2,
  CheckCircle2,
  XCircle,
  PlusCircle,
  ShieldCheck,
  Search,
  School as SchoolIcon,
  CreditCard,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New School Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [motto, setMotto] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoading(true);
    const data = await dbService.getAllSchools();
    setSchools(data);
    setLoading(false);
  };

  const handleToggleStatus = async (schoolId: string, currentActive: boolean) => {
    await dbService.updateSchoolStatus(
      schoolId,
      !currentActive,
      !currentActive ? 'active' : 'suspended'
    );
    await loadSchools();
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !email) return;

    await dbService.createSchool({
      name,
      code: code.toUpperCase(),
      email,
      phone,
      address,
      motto,
      active: true,
      subscriptionStatus: 'active',
      currentSession: '2025/2026',
      currentTerm: 'First Term',
      assessmentWeights: {
        assignmentMax: 10,
        quizMax: 10,
        caMax: 20,
        midTermMax: 20,
        examMax: 40,
      },
    });

    setName('');
    setCode('');
    setEmail('');
    setPhone('');
    setAddress('');
    setMotto('');
    setIsModalOpen(false);
    await loadSchools();
  };

  const filtered = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = schools.filter((s) => s.active).length;
  const suspendedCount = schools.filter((s) => !s.active).length;

  return (
    <div className="space-y-6">
      {/* Super Admin Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-bold tracking-tight">E3 Super Admin Console</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Platform governance & school provisioning. Super Admin monitors school activation and subscriptions across the platform.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Register New School
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Registered Schools"
          value={schools.length}
          subtitle="Platform wide"
          icon={SchoolIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Active Schools"
          value={activeCount}
          subtitle="Operational"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Suspended Schools"
          value={suspendedCount}
          subtitle="Deactivated"
          icon={XCircle}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Schools Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registered Schools Directory</h2>
            <p className="text-xs text-slate-500">Manage activation status & subscriptions</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by school or code..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3">School Name & Code</th>
                <th className="p-3">Contact Details</th>
                <th className="p-3">Current Session / Term</th>
                <th className="p-3">Subscription</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No schools match your search query.
                  </td>
                </tr>
              ) : (
                filtered.map((school) => (
                  <tr key={school.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {school.logoUrl ? (
                          <img
                            src={school.logoUrl}
                            alt={school.name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                            {school.code}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{school.name}</p>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {school.code}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 space-y-0.5">
                      <p className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {school.email}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {school.phone}
                      </p>
                    </td>
                    <td className="p-3 text-slate-800 font-medium">
                      <p className="text-xs">{school.currentSession}</p>
                      <p className="text-[11px] text-slate-500">{school.currentTerm}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant={school.subscriptionStatus === 'active' ? 'success' : 'warning'}>
                        <CreditCard className="w-3 h-3" />
                        {school.subscriptionStatus.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {school.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Suspended</Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleStatus(school.id, school.active)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                          school.active
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {school.active ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register New School Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New School">
        <form onSubmit={handleCreateSchool} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">School Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex International Academy"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">School Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. AIA-003"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 801 234 5678"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@apexacademy.edu"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">School Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full physical address"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">School Motto</label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              placeholder="e.g. Knowledge is Power"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Provision School
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
