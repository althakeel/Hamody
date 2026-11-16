'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  HAMODY_SUPPORT_EMAIL,
  HAMODY_CUSTOMER_SUPPORT_PHONE,
  HAMODY_CUSTOMER_SUPPORT_TEL,
  formatCustomerSupportPhoneDisplay,
} from '@/lib/storeContact'
import { HAMODY_BUSINESS_HOURS_EN } from '@/lib/businessIdentity'

export default function SupportPage() {
  const [user, setUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    orderNumber: '',
    subject: '',
    message: '',
    issue: 'Other',
    priority: 'normal'
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null)
      if (u) {
        setFormData(prev => ({
          ...prev,
          name: u.displayName || '',
          email: u.email || ''
        }))
      }
    })
    return () => unsub()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Prepare ticket data matching the API format
      const looksLikeObjectId = /^[a-fA-F0-9]{24}$/.test(String(formData.orderNumber || '').trim())
      const ticketData = {
        subject: formData.subject,
        category: formData.issue,
        description: formData.orderNumber && !looksLikeObjectId
          ? `Order: ${formData.orderNumber}\n\n${formData.message}`
          : formData.message,
        priority: formData.priority || 'normal',
        orderId: looksLikeObjectId ? formData.orderNumber : undefined
      }

      if (user) {
        const token = await auth.currentUser.getIdToken(true)
        await axios.post('/api/tickets', ticketData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post('/api/contact', {
          name: formData.name,
          email: formData.email,
          topic: formData.issue,
          orderNumber: formData.orderNumber,
          message: `${formData.subject}\n\n${formData.message}`,
        })
      }

      setSuccess(true)
      setFormData({ 
        name: user?.displayName || '', 
        email: user?.email || '', 
        orderNumber: '', 
        subject: '', 
        message: '', 
        issue: 'Other',
        priority: 'normal'
      })
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      console.error('Submit error:', err)
      setError(err.response?.data?.error || 'Failed to submit support ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const supportOptions = [
    { icon: '❓', title: 'Quick Answers', desc: 'Find answers to common questions', link: '/faq' },
    { icon: '✓', title: 'Track Order', desc: 'Check your order status', link: '/track-order' },
    { icon: '↩️', title: 'Return or complain', desc: 'Signed-in return form, or guest form below', link: '/return-request' },
    { icon: '💬', title: 'FAQ & Help', desc: 'Browse our help center', link: '/help' },
  ]

  const fieldClass = 'w-full px-4 py-2.5 rounded-lg border border-[#E9D6B5] bg-white text-[#123D33] placeholder:text-[#9C6E20]/45 focus:border-[#1F5C4A] focus:ring-2 focus:ring-[#1F5C4A]/25 outline-none transition'

  return (
    <div className="bg-white">
      <div className="bg-[#1F5C4A] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">How Can We Help?</h1>
          <p className="text-[#E9D6B5] text-lg">Support hours: {HAMODY_BUSINESS_HOURS_EN}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {supportOptions.map((option, idx) => (
            <Link key={idx} href={option.link} className="group">
              <div className="bg-white rounded-xl p-5 border border-[#E9D6B5] hover:border-[#1F5C4A] hover:shadow-lg transition text-center">
                <div className="text-3xl mb-3 text-[#1F5C4A] group-hover:scale-110 transition">{option.icon}</div>
                <h3 className="font-semibold text-[#123D33] mb-1">{option.title}</h3>
                <p className="text-[#9C6E20] text-sm">{option.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl border border-[#E9D6B5] p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-[#123D33] mb-6">Submit a Ticket</h2>
            
            {!user && (
              <div className="mb-6 p-4 bg-[#FAF8F3] border border-[#E9D6B5] rounded-lg text-[#123D33]">
                No account needed. Use this form for a complaint or return request. Include your order number if you have one.
                {' '}Signed-in customers can also start a return from{' '}
                <Link href="/orders" className="font-semibold text-[#1F5C4A] underline">My Orders</Link>.
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                ✓ Thank you. We received your message and will reply during business hours.
                {user ? (
                  <>
                    {' '}
                    <Link href="/dashboard/tickets" className="font-semibold text-[#1F5C4A] underline">View your tickets</Link>
                  </>
                ) : null}
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                ✗ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#9C6E20] mb-2">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    readOnly={!!user}
                    className={`${fieldClass} ${user ? 'bg-[#FAF8F3] cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#9C6E20] mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    readOnly={!!user}
                    className={`${fieldClass} ${user ? 'bg-[#FAF8F3] cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#9C6E20] mb-2">Issue Type *</label>
                  <select
                    name="issue"
                    value={formData.issue}
                    onChange={handleChange}
                    className={fieldClass}
                  >
                    <option value="Return Request">Return Request</option>
                    <option value="Complaint">Complaint</option>
                    <option value="Order Issue">Order Issue</option>
                    <option value="Product Question">Product Question</option>
                    <option value="Payment Issue">Payment Issue</option>
                    <option value="Account Issue">Account Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9C6E20] mb-2">Priority *</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className={fieldClass}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9C6E20] mb-2">Order Number (Optional)</label>
                <input
                  type="text"
                  name="orderNumber"
                  value={formData.orderNumber}
                  onChange={handleChange}
                  placeholder="If related to an order"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9C6E20] mb-2">Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Brief subject"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9C6E20] mb-2">Message *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Describe your issue in detail..."
                  rows="5"
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1F5C4A] hover:bg-[#123D33] disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? 'Submitting...' : user ? 'Submit Support Ticket' : 'Submit complaint or return request'}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E9D6B5] p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#123D33] mb-6">Other Ways to Reach Us</h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl">📧</span>
                    <div>
                      <p className="font-medium text-[#123D33]">Email</p>
                      <a href={`mailto:${HAMODY_SUPPORT_EMAIL}`} className="text-[#1F5C4A] hover:underline">{HAMODY_SUPPORT_EMAIL}</a>
                      <p className="text-sm text-[#9C6E20] mt-1">We reply during business hours, usually the next business day</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#E9D6B5] pt-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <p className="font-medium text-[#123D33]">Live Chat</p>
                      <p className="text-[#9C6E20] text-sm mt-1">Chat with our team in real-time during business hours</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF8F3] rounded-2xl border border-[#E9D6B5] p-8">
              <h3 className="text-lg font-bold text-[#123D33] mb-3">Business hours</h3>
              <p className="text-[#123D33] text-sm mb-3">{HAMODY_BUSINESS_HOURS_EN}</p>
              <p className="text-[#123D33] text-sm mb-3">
                Phone:{' '}
                <a href={HAMODY_CUSTOMER_SUPPORT_TEL} className="font-semibold text-[#1F5C4A] underline">
                  {formatCustomerSupportPhoneDisplay(HAMODY_CUSTOMER_SUPPORT_PHONE)}
                </a>
              </p>
              <p className="text-[#9C6E20] text-sm">
                We are not a 24/7 desk. Messages sent after hours are answered on the next business day.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="text-center py-8 border-t border-[#E9D6B5]">
          <p className="text-[#9C6E20] mb-4">Still have questions?</p>
          <Link href="/faq" className="inline-flex items-center gap-2 bg-[#1F5C4A] hover:bg-[#123D33] text-white font-medium px-6 py-3 rounded-lg transition">
            Browse our FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}
