"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RegisterPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [username, setUsername] = useState("");
	const [fullName, setFullName] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const router = useRouter();

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setMessage(null);
		const supabase = createSupabaseBrowserClient();
		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					username: username.trim(),
					full_name: fullName.trim(),
				},
			},
		});
		setLoading(false);
		if (error) {
			setError(error.message);
			return;
		}
		setMessage("Compte créé. Vérifie ta boîte mail si la confirmation est requise.");
		// Optionally redirect to login
		// router.push("/login");
	};

	return (
		<div>
			<h1 className="text-xl font-semibold mb-4">Créer un compte</h1>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-sm mb-1">Email</label>
					<input
						type="email"
						className="w-full border rounded px-3 py-2"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</div>
				<div>
					<label className="block text-sm mb-1">Nom d'utilisateur</label>
					<input
						type="text"
						className="w-full border rounded px-3 py-2"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						minLength={3}
						maxLength={32}
						required
						placeholder="ex: pseudo123"
					/>
				</div>
				<div>
					<label className="block text-sm mb-1">Nom complet</label>
					<input
						type="text"
						className="w-full border rounded px-3 py-2"
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						maxLength={80}
						placeholder="Ton nom ou pseudo complet"
					/>
				</div>
				<div>
					<label className="block text-sm mb-1">Mot de passe</label>
					<input
						type="password"
						className="w-full border rounded px-3 py-2"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				{error && <p className="text-sm text-red-600">{error}</p>}
				{message && <p className="text-sm text-green-600">{message}</p>}
				<button
					type="submit"
					className="w-full bg-black text-white rounded py-2"
					disabled={loading}
				>
					{loading ? "Création..." : "S'inscrire"}
				</button>
			</form>
			<p className="text-sm mt-4 text-center">
				Déjà un compte ? <a href="/login" className="underline">Se connecter</a>
			</p>
		</div>
	);
}
