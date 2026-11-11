import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../supabase';
import { useAuth } from "./AuthProvider";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    // Already signed in? The login form has nothing to offer.
    useEffect(() => {
        if (user) navigate("/", { replace: true });
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { data, error: signInError } =
                await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });

            if (signInError) {
                setError(signInError.message);
            } else if (data.session) {
                navigate("/");
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
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
                            <label
                                className="login-label"
                                htmlFor="login-email"
                            >
                                Email
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                autoFocus
                                required
                                className="login-input"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div className="login-field">
                            <label
                                className="login-label"
                                htmlFor="login-password"
                            >
                                Password
                            </label>
                            <input
                                id="login-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                                className="login-input"
                                placeholder="••••••••"
                            />
                        </div>
                        {error && (
                            <p className="login-error" role="alert">
                                {error}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`login-btn-submit ${loading ? "login-btn-loading" : ""}`}
                        >
                            {loading ? "Signing in…" : "Sign in"}
                        </button>
                    </form>
                </div>
                <p className="login-footer">yeet</p>
            </div>
        </div>
    );
}
