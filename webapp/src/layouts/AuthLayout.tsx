import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col">
            <Outlet />
        </div>
    );
}
