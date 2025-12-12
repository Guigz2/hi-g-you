# Instructions pour créer le bucket de stockage Supabase

## Étape 1 : Créer le bucket
1. Allez dans votre tableau de bord Supabase : https://supabase.com/dashboard/project/ldywoejzinwfsdtfidmg
2. Dans le menu latéral, cliquez sur **Storage**
3. Cliquez sur **New bucket**
4. Configurez le bucket :
   - **Name** : `user-files`
   - **Public bucket** : Décochez (pour garder les fichiers privés)
   - Cliquez sur **Create bucket**

## Étape 2 : Configurer les politiques de sécurité (RLS)
Pour que les utilisateurs puissent upload et télécharger leurs fichiers, ajoutez ces politiques RLS :

### Policy 1 : Permettre aux utilisateurs d'uploader leurs fichiers
```sql
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 2 : Permettre aux utilisateurs de lire leurs fichiers
```sql
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 3 : Permettre aux utilisateurs de supprimer leurs fichiers
```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 4 : Permettre aux utilisateurs de mettre à jour leurs fichiers
```sql
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## Étape 3 : Redémarrer l'application
Après avoir créé le bucket, redémarrez votre serveur de développement :
```bash
# Arrêtez le serveur (Ctrl+C) puis relancez :
npm run dev
```

## Vérification
Une fois le bucket créé et les politiques appliquées, vous devriez pouvoir :
- Uploader des fichiers
- Télécharger vos fichiers
- Supprimer vos fichiers

Si vous voulez un nom de bucket différent, changez la variable `NEXT_PUBLIC_SUPABASE_BUCKET` dans le fichier `.env.local`.
