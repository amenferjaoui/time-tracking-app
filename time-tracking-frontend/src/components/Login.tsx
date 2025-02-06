import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authApi } from '../services/api';
import '../styles/form.css';

interface LoginForm {
  username: string;
  password: string;
}

interface Props {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: Props) {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      const response = await authApi.login(data.username, data.password);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLoginSuccess();
    } catch /*(err)*/ {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="form-container">
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label>Nom d'utilisateur :</label>
          <input
            type="text"
            {...register('username', {
              required: "Le nom d'utilisateur est requis"
            })}
          />
          {errors.username && (
            <span className="error">{errors.username.message}</span>
          )}
        </div>

        <div className="form-group">
          <label>Mot de passe :</label>
          <input
            type="password"
            {...register('password', {
              required: 'Le mot de passe est requis',
              minLength: {
                value: 6,
                message: 'Le mot de passe doit contenir au moins 6 caractères'
              }
            })}
          />
          {errors.password && (
            <span className="error">{errors.password.message}</span>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit">Se connecter</button>
      </form>
    </div>
  );
}
