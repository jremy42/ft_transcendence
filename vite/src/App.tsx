import React, { createContext, useState } from 'react'
import { LoginData, LoginForm } from './component/LoginForm'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import axios from "axios";
import { RegisterForm } from './component/RegisterForm'
import { CreateGame } from './component/CreateGame'
import { ListUsers} from './component/ListUsers'
import { FakeGames } from './component/FakeGame'
import { AuthService, useAuthService } from './auth/AuthService'
import { GamePage } from './component/GameScreen'
import { SocketProvider } from './socket/SocketProvider'
import { MuiAppBar } from './component/menu'
import {  ProfilPlayer } from './component/ProfilPlayer'
import { AllRefreshToken } from './component/TokenView'
import { UsernameDialog } from './component/UsernameDialog'
import { FriendList } from './component/FriendList'

export interface Destinations {
	name: string,
	path: string,
	public: boolean
}

export const allRoutes: Destinations[] = [
	{ name: "Register", path: "/Register", public: true },
	{ name: "Login", path: "/Login", public: true },
	{ name: "Chat", path: "/chat", public: false },
	{ name: "Game", path: "/game", public: false },
	{ name: "Leaderboard", path: "/leaderboard", public: false },
	{ name: "AllRefreshToken", path: "/AllRefreshToken", public: true },
	{ name: "Friends", path: "/friends", public: false},

]

export interface IUser {
	username: string,
	email: string,
	id: number
}


function AuthStatus() {
	let auth = useAuthService();
	let navigate = useNavigate();

	if (!auth.user) {
		return <p>You are not logged in.</p>;
	}

	return (
		<p>
			Welcome {auth.user.username}!{" "}
			<button
				onClick={() => {
					auth.logout();
				}}
			>
				Sign out
			</button>
		</p>
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
		return <>
			<Link to="/login">Login Page</Link>;
			<Link to="/register">Register Page</Link>;
		</>
	}
	if (!auth.user.username)
	{
		return (
			<UsernameDialog />
		)
	}

	return children;
}

function Header() {
	return (
		<div>
			<AuthStatus />

			<ul>
				<li>
					<Link to="/Game">Game Page</Link>
				</li>
				<li>
					<Link to="/Chat">Chat Page</Link>
				</li>
			</ul>

			<Outlet />
		</div>
	);
}

function Destinations() {
	const auth = useAuthService()
	const links = allRoutes.map((destination) => {
		if (!auth.user && !destination.public) return (<></>)
		return (
			<>
				<span> </span>
				<span><Link to={destination.path}>{destination.name}</Link></span>
				<span> </span>
			</>)
	})
	return (
		<div>
			{...links}
		</div>
	)
}

//export const AppContext = createContext<any>({});

function Loader() {
	return (
		<div>
			Loading...
		</div>
	)
}


function App() {

	const [backIsReady, setBackIsReady] = useState(false)
	const [cooldown, setCooldown] = React.useState<number>(10);

	React.useEffect(() => {
		const intevalId = setInterval(() => {
			axios.get("/api/areyouready").then((response) => {
				if (response.status === 200) {
					setBackIsReady(true);
					clearInterval(intevalId);
				}
			}).catch((error) => {
				console.log(error);
			})
			if (cooldown < 1000)
				setCooldown(cooldown => cooldown *= 10);
		}, cooldown)
		return () => clearInterval(intevalId);
	}, [cooldown])
	if (!backIsReady) return <Loader />

	return (
		<AuthService>
			<SocketProvider>
				<RequireAuth>
					<MuiAppBar />
				</RequireAuth>

				<Routes>
					<Route element={<div> <Destinations /> <Header /> </div>}>
						<Route path="/" element={<Navigate to='/game' replace />} />
						<Route path="game/">
							<Route path=":idGame" element={
								<RequireAuth>
									<GamePage />
								</RequireAuth>
							} />
							<Route path="" element={
								<RequireAuth>
									<CreateGame />
								</RequireAuth>
							} />
						</Route>
						<Route path='/public' element={<div>Public</div>} />
						<Route
							path="/chat"
							element={
								<RequireAuth>
									<>
										<label>w</label>
									</>
								</RequireAuth>
							}
						/>
						<Route path="/Login" element={<LoginForm />} />
						<Route path="/Register" element={<RegisterForm />} />
						<Route path="/leaderboard" element={<><ListUsers /> <br /> <FakeGames/></>} />
						<Route path="/AllRefreshToken" element={<AllRefreshToken />} />
						<Route path="/player/">
							<Route path=":idPlayer" element={<ProfilPlayer />} />
						</Route>
						<Route path="/friends" element={<FriendList/>} />
						<Route path='*' element={<div>404</div>} />
					</Route>
				</Routes>
			</SocketProvider>
		</AuthService>
	);
}

export default App
