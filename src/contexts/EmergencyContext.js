import React, { createContext, useState, useContext } from 'react';

const EmergencyContext = createContext();

export const EmergencyProvider = ({ children }) => {
  const [respondedEmergencies, setRespondedEmergencies] = useState([]);
  const [ignoredEmergencies, setIgnoredEmergencies] = useState([]);

  const respondToEmergency = (emergencyId) => {
    const normalizedId = String(emergencyId);
    setRespondedEmergencies(prev => (
      prev.some(id => String(id) === normalizedId) ? prev : [...prev, normalizedId]
    ));
  };

  const cancelEmergencyResponse = (emergencyId) => {
    const normalizedId = String(emergencyId);
    setRespondedEmergencies(prev => prev.filter(id => String(id) !== normalizedId));
  };

  const ignoreEmergency = (emergencyId) => {
    const normalizedId = String(emergencyId);
    setIgnoredEmergencies(prev => (
      prev.some(id => String(id) === normalizedId) ? prev : [...prev, normalizedId]
    ));
  };

  const isResponded = (emergencyId) => {
    return respondedEmergencies.includes(emergencyId);
  };

  const isIgnored = (emergencyId) => {
    return ignoredEmergencies.some(id => String(id) === String(emergencyId));
  };

  return (
    <EmergencyContext.Provider
      value={{
        respondedEmergencies,
        ignoredEmergencies,
        respondToEmergency,
        cancelEmergencyResponse,
        ignoreEmergency,
        isResponded,
        isIgnored
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within EmergencyProvider');
  }
  return context;
};
