import React, { useState, useEffect } from 'react';
import PortalGateway from './PortalGateway';
import PatientLogin from './PatientLogin';
import GPLogin from './GPLogin';

interface LoginProps {
  onLogin: (user: { role: 'patient' | 'gp'; name: string }) => void;
  defaultPortal?: 'patient' | 'gp' | 'select';
}

export default function Login({ onLogin, defaultPortal }: LoginProps) {
  const [currentView, setCurrentView] = useState<'select' | 'patient' | 'gp'>(() => {
    if (defaultPortal) return defaultPortal;
    const saved = localStorage.getItem('medtriage_preferred_portal');
    if (saved === 'patient' || saved === 'gp') return saved;
    return 'select';
  });

  const handleSelectPatient = () => {
    localStorage.setItem('medtriage_preferred_portal', 'patient');
    setCurrentView('patient');
  };

  const handleSelectGP = () => {
    localStorage.setItem('medtriage_preferred_portal', 'gp');
    setCurrentView('gp');
  };

  const handleBackToGateway = () => {
    localStorage.removeItem('medtriage_preferred_portal');
    setCurrentView('select');
  };

  if (currentView === 'patient') {
    return (
      <PatientLogin 
        onLogin={onLogin}
        onSwitchToGP={handleSelectGP}
        onBackToGateway={handleBackToGateway}
      />
    );
  }

  if (currentView === 'gp') {
    return (
      <GPLogin 
        onLogin={onLogin}
        onSwitchToPatient={handleSelectPatient}
        onBackToGateway={handleBackToGateway}
      />
    );
  }

  return (
    <PortalGateway 
      onSelectPatient={handleSelectPatient}
      onSelectGP={handleSelectGP}
    />
  );
}
