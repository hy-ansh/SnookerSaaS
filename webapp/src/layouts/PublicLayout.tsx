import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
    return (
        <div className="flex flex-col min-h-screen">

            <main className="flex-grow">
                <Outlet />
            </main>

        </div>
    );
}
