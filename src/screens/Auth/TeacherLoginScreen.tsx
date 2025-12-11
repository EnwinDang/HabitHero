import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAppState } from '../../context/AppStateContext';
import './AuthScreen.css';

export const TeacherLoginScreen: React.FC = () => {
  const { login } = useAppState();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    login(email, password);
    navigate('/dashboard');
  };

  return (
    <ScreenContainer>
      <div className="auth-center">
        <Card style={{ width: '100%', maxWidth: '400px' }}>
          <h1 className="auth-title">EduRPG Teacher Portal</h1>
          <div className="auth-form">
            <Input
              label="School email"
              placeholder="name@school.be"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              helperText="Must be a valid school email (e.g. @school.be)"
            />
            <Input
              label="Password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
            <Button fullWidth onClick={handleLogin}>
              Log in as Teacher
            </Button>
            <button className="auth-link" onClick={() => navigate('/register')}>
              No account? Create teacher account
            </button>
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
};
