import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../supabase';

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: username,
            password: password,
        });

        if (error) {
            setError(error.message);
        } else if (data.session) {
            navigate("/");
        }

        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="login-noise" />
            <div className="login-wrapper">
                <div className="login-logo">
                    <h1 className="login-logo-title">HOMEMADE</h1>
                    <p className="login-logo-subtitle">Private Media</p>
                </div>
                <div className="login-card">
                    <h2 className="login-heading">Sign in</h2>
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="login-field">
                            <label className="login-label">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                required
                                className="login-input"
                            />
                        </div>
                        <div className="login-field">
                            <label className="login-label">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                                className="login-input"
                            />
                        </div>
                        {error && <p className="login-error">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`login-btn-submit ${loading ? "login-btn-loading" : ""}`}
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>
                </div>
                <p className="login-footer">yeet</p>
            </div>
        </div>
    );
}