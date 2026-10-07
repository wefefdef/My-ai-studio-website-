import { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  FileText,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  Check,
  AlertCircle,
  Upload,
  Search,
  CheckCircle2,
  Clock,
  Shield,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  googleLogout,
  initAuth,
  listDriveFiles,
  uploadTextToDrive,
  deleteDriveFile,
  DriveFileItem,
} from '../services/googleDrive';
import { UserAccount } from '../types';

interface GoogleDriveModalProps {
  open: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
}

export function GoogleDriveModal({ open, onClose, currentUser }: GoogleDriveModalProps) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Destructive deletion confirmation state (Mandatory per Workspace Skill)
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export action loading
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
        loadFiles();
      },
      () => {
        setGoogleUser(null);
        setFiles([]);
      }
    );
    return () => unsubscribe();
  }, [open]);

  const loadFiles = async (query?: string) => {
    setFilesLoading(true);
    setError(null);
    try {
      const items = await listDriveFiles(query);
      setFiles(items);
    } catch (err: any) {
      console.error('Error fetching drive files:', err);
      setError(err?.message || 'Could not fetch Google Drive files.');
    } finally {
      setFilesLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setGoogleUser(res.user);
        setSuccessMsg('Successfully connected to Google Drive!');
        setTimeout(() => setSuccessMsg(null), 3000);
        await loadFiles();
      }
    } catch (err: any) {
      console.error('Failed to sign in:', err);
      setError(err?.message || 'Failed to connect Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setFiles([]);
      setSuccessMsg('Disconnected from Google Drive.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to disconnect.');
    }
  };

  // Export Trading History to CSV in Google Drive
  const handleExportTradingStatement = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Immediate_Trading_Statement_${dateStr}.csv`;

      let csv = 'ID,Symbol,Asset Name,Side,Lot Size,Entry Price,Current Price,P&L (USD),Duration,Open Time\n';
      const positions = currentUser?.positions || [];

      if (positions.length > 0) {
        positions.forEach((p) => {
          csv += `"${p.id}","${p.symbol}","${p.assetName}","${p.side.toUpperCase()}",${p.lotSize},${p.entryPrice},${p.currentPrice},${p.pnl.toFixed(2)},"${p.duration || 'N/A'}","${new Date(p.openTime).toISOString()}"\n`;
        });
      } else {
        csv += `"SAMPLE-01","BTC/USD OTC","Bitcoin OTC","BUY",0.05,89250.00,89420.00,8.50,"1 Day","${new Date().toISOString()}"\n`;
        csv += `"SAMPLE-02","EUR/USD OTC","EUR/USD OTC","SELL",0.10,1.0820,1.0815,5.00,"1 Day","${new Date().toISOString()}"\n`;
      }

      // Summary lines
      const balance =
        currentUser?.accountType === 'demo'
          ? currentUser?.demoEquity
          : currentUser?.liveEquity;
      csv += `\n"Account Email","${currentUser?.email || 'N/A'}"\n`;
      csv += `"Account Balance","${(balance ?? 1000).toFixed(2)} USD"\n`;
      csv += `"Account Mode","${(currentUser?.accountType || 'live').toUpperCase()}"\n`;
      csv += `"Generated At","${new Date().toLocaleString()}"\n`;

      const uploaded = await uploadTextToDrive(fileName, csv, 'text/csv');
      setSuccessMsg(`Uploaded "${uploaded.name}" to your Google Drive!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadFiles(searchTerm);
    } catch (err: any) {
      setError(err?.message || 'Failed to export statement to Google Drive.');
    } finally {
      setIsExporting(false);
    }
  };

  // Backup KYC & Account Dossier to Drive
  const handleBackupAccountDossier = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Immediate_Account_Profile_${dateStr}.txt`;

      const balance =
        currentUser?.accountType === 'demo'
          ? currentUser?.demoEquity
          : currentUser?.liveEquity;

      const dossier = `=====================================================
IMMEDIATE MULTI-ASSET TRADING PLATFORM
ACCOUNT PROFILE & REGISTRATION DOSSIER
=====================================================

Account Holder: ${currentUser?.fullName || 'Valued Trader'}
Email: ${currentUser?.email || 'N/A'}
Phone: ${currentUser?.phone || 'N/A'}
Country: ${currentUser?.country || 'N/A'}
Account Status: Active (${currentUser?.isVerified ? 'VERIFIED' : 'PENDING VERIFICATION'})
Account Type: ${(currentUser?.accountType || 'live').toUpperCase()} TRADING
Current Balance: $${(balance ?? 1000).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
Registered At: ${currentUser?.createdAt || new Date().toISOString()}

REGULATORY & COMPLIANCE NOTICE:
Immediate Payments Ltd operates under authorization and supervision
of the Central Bank of Nigeria (CBN), Securities and Exchange Commission (SEC),
Corporate Affairs Commission (CAC), and international supervisory standards.

This document was backed up directly to Google Drive via secure OAuth authorization.
Timestamp: ${new Date().toLocaleString()}
=====================================================`;

      const uploaded = await uploadTextToDrive(fileName, dossier, 'text/plain');
      setSuccessMsg(`Backed up "${uploaded.name}" to your Google Drive!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadFiles(searchTerm);
    } catch (err: any) {
      setError(err?.message || 'Failed to backup profile to Google Drive.');
    } finally {
      setIsExporting(false);
    }
  };

  // Perform Destructive Deletion with Mandatory Confirmation
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteDriveFile(fileToDelete.id);
      setSuccessMsg(`Deleted "${fileToDelete.name}" from Google Drive.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setFileToDelete(null);
      await loadFiles(searchTerm);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete file from Google Drive.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!open) return null;

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
      return <FileSpreadsheet size={18} style={{ color: '#10b981' }} />;
    }
    if (mimeType.includes('text') || mimeType.includes('document')) {
      return <FileText size={18} style={{ color: '#3b82f6' }} />;
    }
    return <File size={18} style={{ color: '#8b5cf6' }} />;
  };

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="app-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="app-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="lm-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #4285F4, #34A853)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(66, 133, 244, 0.25)',
              }}
            >
              <HardDrive size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, margin: 0, fontWeight: 700, color: 'var(--text)' }}>
                Google Drive Storage & Backups
              </h2>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>
                Store, export, and sync your trading statements securely
              </span>
            </div>
          </div>
          <button type="button" className="lm-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="lm-body" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {error && (
            <div
              className="fade-in"
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #f87171',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 13,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              className="fade-in"
              style={{
                background: '#d1fae5',
                color: '#065f46',
                border: '1px solid #6ee7b7',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 13,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{successMsg}</span>
            </div>
          )}

          {!googleUser ? (
            /* Unauthenticated View: Sign in with Google */
            <div
              style={{
                textAlign: 'center',
                padding: '36px 20px',
                background: 'var(--card)',
                borderRadius: 12,
                border: '1px dashed var(--border)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(66, 133, 244, 0.1)',
                  color: '#4285F4',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <HardDrive size={28} />
              </div>
              <h3 style={{ fontSize: 17, margin: '0 0 8px 0', color: 'var(--text)' }}>
                Connect your Google Drive Account
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text2)',
                  maxWidth: 440,
                  margin: '0 auto 24px',
                  lineHeight: 1.5,
                }}
              >
                Link your Google Drive with permission to back up your trading activity statements,
                transaction receipts, and personal verification files directly to your cloud storage.
              </p>

              {/* Official Google Sign-In Button */}
              <button
                type="button"
                onClick={handleConnect}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 20px',
                  background: '#fff',
                  color: '#3c4043',
                  border: '1px solid #dadce0',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  transition: 'background-color .2s, box-shadow .2s',
                }}
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ width: 20, height: 20, display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{loading ? 'Connecting Google Drive...' : 'Sign in with Google'}</span>
              </button>
            </div>
          ) : (
            /* Authenticated View */
            <div>
              {/* Account Status Card */}
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Google User'}
                      style={{ width: 42, height: 42, borderRadius: '50%', border: '2px solid #34A853' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {googleUser.displayName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: 14, color: 'var(--text)' }}>
                        {googleUser.displayName || 'Google Account'}
                      </strong>
                      <span
                        style={{
                          background: '#10b98120',
                          color: '#10b981',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 10,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Check size={12} /> Connected
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{googleUser.email}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text2)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Disconnect
                </button>
              </div>

              {/* Action Buttons: Export Statement & Backup */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <button
                  type="button"
                  onClick={handleExportTradingStatement}
                  disabled={isExporting}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: 'var(--accent-glow)',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                  }}
                >
                  <FileSpreadsheet size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Export Trading Statement</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Save CSV record to Google Drive</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleBackupAccountDossier}
                  disabled={isExporting}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                  }}
                >
                  <Shield size={20} style={{ flexShrink: 0, color: '#34A853' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Backup Profile Dossier</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Store KYC &amp; profile details</div>
                  </div>
                </button>
              </div>

              {/* Search & Drive File Browser */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    flex: 1,
                  }}
                >
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text3)',
                    }}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') loadFiles(searchTerm);
                    }}
                    placeholder="Search files in Google Drive..."
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => loadFiles(searchTerm)}
                  disabled={filesLoading}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text2)',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                  title="Refresh files"
                >
                  <RefreshCw size={14} className={filesLoading ? 'spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* File List */}
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  background: 'var(--card)',
                  maxHeight: 260,
                  overflowY: 'auto',
                }}
              >
                {filesLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px' }} />
                    Loading your Google Drive files...
                  </div>
                ) : files.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    No files found in Google Drive matching query.
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {getFileIcon(file.mimeType)}
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--text)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={file.name}
                          >
                            {file.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 10 }}>
                            <span>{formatFileSize(file.size)}</span>
                            {file.modifiedTime && (
                              <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--accent)',
                              fontSize: 12,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              textDecoration: 'none',
                            }}
                            title="Open in Google Drive"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}

                        {/* Explicit Deletion Button */}
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          title="Delete file"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            Google Workspace OAuth 2.0 • Immediate Cloud Services
          </span>
          <button
            type="button"
            className="primary-button"
            onClick={onClose}
            style={{ padding: '8px 20px', fontSize: 13 }}
          >
            Done
          </button>
        </div>
      </div>

      {/* MANDATORY USER CONFIRMATION MODAL FOR DESTRUCTIVE OPERATION */}
      {fileToDelete && (
        <div
          className="app-modal-overlay"
          style={{ zIndex: 10001, background: 'rgba(0,0,0,0.65)' }}
          onClick={() => !isDeleting && setFileToDelete(null)}
        >
          <div
            className="app-modal"
            style={{ maxWidth: 440, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: 17, margin: '0 0 8px 0', textAlign: 'center', color: 'var(--text)' }}>
              Delete File from Google Drive?
            </h3>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text2)',
                textAlign: 'center',
                margin: '0 0 16px 0',
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: 'var(--text)' }}>"{fileToDelete.name}"</strong> from your Google
              Drive? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {isDeleting ? <RefreshCw size={14} className="spin" /> : <Trash2 size={14} />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
