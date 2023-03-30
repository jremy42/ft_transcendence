import { MyForm } from './pages/NameSelector'
import { GetAll } from './pages/getall'
import { GameCanvas } from './game/game'
import React, { createContext, useState } from 'react'
import { Socket, io } from 'socket.io-client'
import { getToken } from './token/token'
import { LoginForm } from './pages/LoginPage'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { fakeAuthProvider } from './auth'

/*
const socket = new WebSocket(`ws://${window.location.host}/ws/`)
socket.onopen = function () {

	// Send an initial message
	socket.send(JSON.stringify(apiCall));

	// Listen for messages
	socket.onmessage = function (event) {
		console.log('Client received a message', event);
	};

	// Listen for socket closes
	socket.onclose = function (event) {
		console.log('Client notified socket has closed', event);
	};

	// To close the socket....
	//socket.close()
};
*/

interface AuthContextType {
	user: any;
	login: (user: string, callback: VoidFunction) => void;
	logout: (callback: VoidFunction) => void;
}

let AuthContext = React.createContext<AuthContextType>(null!);

function AuthService({ children }: { children: React.ReactNode }) {
	let [user, setUser] = React.useState<any>(null);

	let login = (newUser: string, callback: VoidFunction) => {
		return fakeAuthProvider.login(() => {
			setUser(newUser);
			callback();
		});
	};

	let logout = (callback: VoidFunction) => {
		return fakeAuthProvider.logout(() => {
			setUser(null);
			callback();
		});
	};

	let value = { user, login, logout };

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
function useAuthService() {
	return React.useContext(AuthContext);
}
function AuthStatus() {
	let auth = useAuthService();
	let navigate = useNavigate();

	if (!auth.user) {
		return <p>You are not logged in.</p>;
	}

	return (
		<p>
			Welcome {auth.user}!{" "}
			<button
				onClick={() => {
					auth.logout(() => navigate("/"));
				}}
			>
				Sign out
			</button>
		</p>
	);
}

function LoginPage() {
	let navigate = useNavigate();
	let location = useLocation();
	let auth = useAuthService();

	let from = location.state?.from?.pathname || "/";

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		let formData = new FormData(event.currentTarget);
		let username = formData.get("username") as string;

		auth.login(username, () => {
			// Send them back to the page they tried to visit when they were
			// redirected to the login page. Use { replace: true } so we don't create
			// another entry in the history stack for the login page.  This means that
			// when they get to the protected page and click the back button, they
			// won't end up back on the login page, which is also really nice for the
			// user experience.
			navigate(from, { replace: true });
		});
	}

	return (
		<div>
			<p>You must log in to view the page at {from}</p>

			<form onSubmit={handleSubmit}>
				<label>
					Username: <input name="username" type="text" />
				</label>{" "}
				<button type="submit">Login</button>
			</form>
		</div>
	);
}

function RequireAuth({ children }: { children: JSX.Element }) {
	let auth = useAuthService();
	let location = useLocation();

	if (!auth.user) {
		// Redirect them to the /login page, but save the current location they were
		// trying to go to when they were redirected. This allows us to send them
		// along to that page after they login, which is a nicer user experience
		// than dropping them off on the home page.
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return children;
}

function Header() {
	return (
		<div>
			<AuthStatus />

			<ul>
				<li>
					<Link to="/">Game Page</Link>
				</li>
				<li>
					<Link to="/chat">Chat Page</Link>
				</li>
			</ul>

			<Outlet />
		</div>
	);
}

export const AppContext = createContext<any>({});

function App() {

	return (
		<AuthService>
			<Routes>
				<Route element={<Header />}>
					<Route path="/" element={
						<RequireAuth>
							<div>Game</div>
						</RequireAuth>
					} />
					<Route path='/public' element={<div>Public</div>} />
					<Route
						path="/chat"
						element={
							<RequireAuth>
								<>
								<label>w</label>
								<LoginForm />
								</>
							</RequireAuth>
						}
					/>
					<Route path="/login" element={<LoginPage />} />
				</Route>
			</Routes>
		</AuthService>
	);
	function newSocket() {
		return io({
			auth: {
				token: getToken()
			}
		})
	}

	function reconnect() {
		socket.close()
		setSocket(newSocket());
	}

	const [socket, setSocket] = useState<Socket>(newSocket());
	const navigate = useNavigate()
	React.useEffect(() => {
		console.log('Creating event listener');
		function onConnect() {
			console.log('Emiting a ping beging')
			// socket.emit('ping', 'This is my first ping')e
			console.log('Emiting a ping end')

		}
		function onMessage(data: any) {
			console.log('Receiving a message')
			console.log(data)
		}

		function onException(data: any) {
			if (data.status === "error") {
				console.log('Redirecting to login')
				navigate('/login')
			}
			console.log('Receiving an exception')
			console.log(data)
			socket.disconnect()
		}

		socket.on('connect', onConnect);
		socket.on('message', onMessage)
		socket.on('exception', onException)
		return () => {
			socket.off('connect', onConnect);
			socket.off('message', onMessage)
			socket.off('exception', onException)
		}
	}, [socket])

	return (
		<div className="App">
			<AppContext.Provider value={{ socket, reconnect, navigate }}>
				<MyForm />
				<GetAll />
				<GameCanvas />
				<button onClick={() => { socket.emit('ping', 'Coucou') }}>Say hello to everyone</button>
				<Link to="/login"> go login</Link>
			</AppContext.Provider>
		</div>
	)
}

export default App
