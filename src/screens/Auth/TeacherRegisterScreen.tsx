import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAppState } from '../../context/AppStateContext';
import './AuthScreen.css';

export const TeacherRegisterScreen: React.FC = () => {
  const { register } = useAppState();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleRegister = () => {
    if (password !== confirm) return;
    register(fullName, email, password);
    navigate('/dashboard');
  };

  return (
    <ScreenContainer>
      <div className="auth-center">
        <Card style={{ maxWidth: '400px' }}>
          <h1 className="auth-title">Create teacher account</h1>
          <div className="auth-form">
            <Input
              label="Full name"
              placeholder="Dr. Elise Martens"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="School email"
              placeholder="name@school.be"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
            <Input
              label="Password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
            <Input
              label="Confirm password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
            />
            <Button fullWidth onClick={handleRegister}>
              Create teacher account
            </Button>
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
};
