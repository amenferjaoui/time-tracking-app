import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authApi } from '../services/api';
import { ApiError } from '../types';
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
      
      // Vérifier le rôle de l'utilisateur
      const userRole = response.data.role;
      const isStaff = response.data.is_staff;
      const isSuperuser = response.data.is_superuser;
      
      console.log('Login successful:', {
        username: response.data.username,
        role: userRole,
        is_staff: isStaff,
        is_superuser: isSuperuser
      });
      
      onLoginSuccess();
    } catch (err) {
      console.error('Login error:', err);
      const apiError = err as ApiError;
      
      if (apiError.response?.status === 401) {
        setError("Nom d'utilisateur ou mot de passe incorrect");
      } else if (apiError.response?.data) {
        // Gérer les erreurs de validation du backend
        if (typeof apiError.response.data === 'object') {
          const errors = Object.entries(apiError.response.data)
            .map(([field, messages]) => {
              if (Array.isArray(messages)) {
                return `${field}: ${messages.join(', ')}`;
              }
              return `${field}: ${messages}`;
            })
            .join(', ');
          setError(errors);
        } else {
          setError(apiError.response.data as string);
        }
      } else {
        setError("Une erreur s'est produite lors de la connexion");
      }
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
