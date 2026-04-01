import React, { createContext, useState, useContext } from 'react';

const EmergencyContext = createContext();

export const EmergencyProvider = ({ children }) => {
  const [respondedEmergencies, setRespondedEmergencies] = useState([]);
  const [ignoredEmergencies, setIgnoredEmergencies] = useState([]);

  const respondToEmergency = (emergencyId) => {
    setRespondedEmergencies(prev => [...prev, emergencyId]);
  };

  const ignoreEmergency = (emergencyId) => {
    setIgnoredEmergencies(prev => [...prev, emergencyId]);
  };

  const isResponded = (emergencyId) => {
    return respondedEmergencies.includes(emergencyId);
  };

  const isIgnored = (emergencyId) => {
    return ignoredEmergencies.includes(emergencyId);
  };

  return (
    <EmergencyContext.Provider
      value={{
        respondedEmergencies,
        ignoredEmergencies,
        respondToEmergency,
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
