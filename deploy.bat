@echo off
echo 🚀 Building project...
npm run build

echo 📂 Adding dist folder...
git add dist -f

echo 📌 Committing changes...
git commit -m "Add Dist"

echo 🚢 Pushing to gh-pages...
git subtree push --prefix dist origin gh-pages

echo ✅ Deployment completed! See: https://ngminh2.github.io/DeepFake_Demo/
