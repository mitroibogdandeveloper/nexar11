import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	Users,
	Package,
	Settings,
	Edit,
	Trash2,
	CheckCircle,
	XCircle,
	Eye,
	AlertTriangle,
	Search,
	Filter,
	User,
	Building,
	ArrowUpDown,
	RefreshCw,
	Shield,
} from "lucide-react";
import { admin, supabase } from "../lib/supabase";

const AdminPage = () => {
	const [activeTab, setActiveTab] = useState("pending");
	const [listings, setListings] = useState<any[]>([]);
	const [pendingListings, setPendingListings] = useState<any[]>([]);
	const [users, setUsers] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [sellerTypeFilter, setSellerTypeFilter] = useState("all");
	const [sortField, setSortField] = useState("created_at");
	const [sortDirection, setSortDirection] = useState("desc");
	const [isAdmin, setIsAdmin] = useState(false);
	const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>(
		{},
	);

	const navigate = useNavigate();

	const checkAdminStatus = async () => {
		try {
			setIsLoading(true); // Acesta va fi setat la false în loadListings/loadUsers
			const adminStatus = await admin.isAdmin();
			setIsAdmin(adminStatus);
			if (!adminStatus) {
				setError("Acces neautorizat. Nu sunteți administrator.");
				setIsLoading(false); // Setează isLoading la false dacă nu ești admin
			}
		} catch (err) {
			console.error("Error checking admin status:", err);
			setError("Eroare la verificarea statutului de administrator.");
			setIsLoading(false);
		}
	};

	const loadListings = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const { data, error } = await admin.getAllListings();
			if (error) {
				setError(`Eroare la încărcarea anunțurilor: ${error.message}`);
			} else {
				setListings(data || []);
			}
		} catch (err: any) {
			setError(`Eroare neașteptată la încărcarea anunțurilor: ${err.message}`);
			console.error("Error loading listings:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const loadPendingListings = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const { data, error } = await admin.getPendingListings();
			if (error) {
				setError(`Eroare la încărcarea anunțurilor în așteptare: ${error.message}`);
			} else {
				setPendingListings(data || []);
			}
		} catch (err: any) {
			setError(`Eroare neașteptată la încărcarea anunțurilor în așteptare: ${err.message}`);
			console.error("Error loading pending listings:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const loadUsers = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const { data, error } = await admin.getAllUsers();
			if (error) {
				setError(`Eroare la încărcarea utilizatorilor: ${error.message}`);
			} else {
				setUsers(data || []);
			}
		} catch (err: any) {
			setError(
				`Eroare neașteptată la încărcarea utilizatorilor: ${err.message}`,
			);
			console.error("Error loading users:", err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		checkAdminStatus();
	}, []);

	useEffect(() => {
		if (isAdmin) {
			if (activeTab === "listings") {
				loadListings();
			} else if (activeTab === "pending") {
				loadPendingListings();
			} else if (activeTab === "users") {
				loadUsers();
			}
		}
	}, [activeTab, isAdmin]); // Reîncarcă la schimbarea tab-ului sau a statutului admin

	const handleApproveRejectListing = async (
		listingId: string,
		action: 'approve' | 'reject'
	) => {
		setIsProcessing((prev) => ({ ...prev, [listingId]: true }));
		const newStatus = action === 'approve' ? 'active' : 'rejected';
		try {
			const { error } = await admin.updateListingStatus(listingId, newStatus);
			if (error) {
				alert(`Eroare la ${action === 'approve' ? 'aprobarea' : 'respingerea'} anunțului: ${error.message}`);
			} else {
				alert(`Anunțul a fost ${action === 'approve' ? 'aprobat' : 'respins'} cu succes.`);
				// Reîncarcă lista pentru a reflecta schimbarea
				if (activeTab === 'pending') {
					loadPendingListings();
				} else {
					loadListings();
				}
			}
		} catch (err: any) {
			alert(`A apărut o eroare neașteptată: ${err.message}`);
		} finally {
			setIsProcessing((prev) => ({ ...prev, [listingId]: false }));
		}
	};

	const handleDeleteListing = async (listingId: string) => {
		if (!confirm("Ești sigur că vrei să ștergi acest anunț?")) return;
		setIsProcessing((prev) => ({ ...prev, [listingId]: true }));
		try {
			const { error } = await admin.deleteListing(listingId);
			if (error) {
				alert(`Eroare la ștergerea anunțului: ${error.message}`);
			} else {
				alert("Anunțul a fost șters cu succes.");
				if (activeTab === 'pending') {
					setPendingListings((prev) => prev.filter((l) => l.id !== listingId));
				} else {
					setListings((prev) => prev.filter((l) => l.id !== listingId));
				}
			}
		} catch (err: any) {
			alert(`A apărut o eroare neașteptată: ${err.message}`);
		} finally {
			setIsProcessing((prev) => ({ ...prev, [listingId]: false }));
		}
	};

	const handleDeleteUser = async (userId: string) => {
		if (
			!confirm(
				"ATENȚIE: Această acțiune va șterge utilizatorul și toate anunțurile sale. Ești sigur că vrei să continui?",
			)
		)
			return;

		try {
			setIsProcessing((prev) => ({ ...prev, [userId]: true }));

			// 1. Obținem profilul utilizatorului pentru a avea ID-ul profilului
			console.log("Attempting to fetch profile for userId:", userId);
			const { data: profile, error: profileError } = await supabase
				.from("profiles")
				.select("id")
				.eq("user_id", userId)
				.single();

			if (profileError) {
				console.error("Error fetching user profile:", profileError);
				alert(
					`Eroare la obținerea profilului utilizatorului: ${profileError.message}`,
				);
				return;
			}
			if (!profile) {
				console.error("Profile not found for userId:", userId);
				alert("Profilul utilizatorului nu a fost găsit.");
				return;
			}
			console.log("Fetched profile:", profile);

			// 2. Ștergem toate anunțurile utilizatorului
			console.log("Attempting to delete listings for seller_id:", profile.id);
			const { error: listingsError } = await supabase
				.from("listings")
				.delete()
				.eq("seller_id", profile.id);

			if (listingsError) {
				console.error("Error deleting user listings:", listingsError);
				alert(
					`Eroare la ștergerea anunțurilor utilizatorului: ${listingsError.message}`,
				);
				return;
			}
			console.log("Listings deleted successfully for seller_id:", profile.id);

			// 3. Ștergem profilul utilizatorului
			console.log("Attempting to delete profile for userId:", userId);
			const { error: deleteProfileError } = await supabase
				.from("profiles")
				.delete()
				.eq("user_id", userId);

			if (deleteProfileError) {
				console.error("Error deleting user profile:", deleteProfileError);
				alert(
					`Eroare la ștergerea profilului utilizatorului: ${deleteProfileError.message}`,
				);
				return;
			}
			console.log("Profile deleted successfully for userId:", userId);

			// 4. Ștergem utilizatorul din auth.users
			console.log(
				"Attempting to delete user from auth.users for userId:",
				userId,
			);
			const { error: authDeleteError } = await admin.deleteUser(userId); // Folosește noua funcție admin.deleteUser

			if (authDeleteError) {
				console.error("Error deleting user from auth.users:", authDeleteError);
				alert(
					`Eroare la ștergerea utilizatorului din autentificare: ${authDeleteError.message}`,
				);
				return;
			}
			console.log(
				"User deleted successfully from auth.users for userId:",
				userId,
			);

			// Eliminăm utilizatorul din listă
			setUsers((prev) => prev.filter((user) => user.user_id !== userId));

			alert("Utilizatorul și toate anunțurile sale au fost șterse cu succes!");

			// Reîncărcăm anunțurile pentru a reflecta schimbările
			loadListings();
			loadPendingListings();
		} catch (err: any) {
			console.error("Error in handleDeleteUser:", err);
			alert("A apărut o eroare la ștergerea utilizatorului");
		} finally {
			setIsProcessing((prev) => ({ ...prev, [userId]: false }));
		}
	};

	const filteredListings = listings
		.filter((listing) => {
			const matchesSearch = listing.title
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
			const matchesStatus =
				statusFilter === "all" || listing.status === statusFilter;
			const matchesSellerType =
				sellerTypeFilter === "all" || listing.seller_type === sellerTypeFilter;
			return matchesSearch && matchesStatus && matchesSellerType;
		})
		.sort((a, b) => {
			const aValue = a[sortField];
			const bValue = b[sortField];

			if (typeof aValue === "string" && typeof bValue === "string") {
				return sortDirection === "asc"
					? aValue.localeCompare(bValue)
					: bValue.localeCompare(aValue);
			}
			if (typeof aValue === "number" && typeof bValue === "number") {
				return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
			}
			return 0;
		});

	const filteredPendingListings = pendingListings
		.filter((listing) => {
			const matchesSearch = listing.title
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
			const matchesSellerType =
				sellerTypeFilter === "all" || listing.seller_type === sellerTypeFilter;
			return matchesSearch && matchesSellerType;
		})
		.sort((a, b) => {
			const aValue = a[sortField];
			const bValue = b[sortField];

			if (typeof aValue === "string" && typeof bValue === "string") {
				return sortDirection === "asc"
					? aValue.localeCompare(bValue)
					: bValue.localeCompare(aValue);
			}
			if (typeof aValue === "number" && typeof bValue === "number") {
				return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
			}
			return 0;
		});

	const filteredUsers = users
		.filter((user) => {
			const matchesSearch =
				user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				user.name.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesSearch;
		})
		.sort((a, b) => {
			const aValue = a[sortField];
			const bValue = b[sortField];

			if (typeof aValue === "string" && typeof bValue === "string") {
				return sortDirection === "asc"
					? aValue.localeCompare(bValue)
					: bValue.localeCompare(aValue);
			}
			if (typeof aValue === "number" && typeof bValue === "number") {
				return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
			}
			return 0;
		});

	const handleSort = (field: string) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	const getSortIcon = (field: string) => {
		if (sortField === field) {
			return sortDirection === "asc" ? (
				<ArrowUpDown className="inline-block w-4 h-4 ml-1 rotate-180" />
			) : (
				<ArrowUpDown className="inline-block w-4 h-4 ml-1" />
			);
		}
		return <ArrowUpDown className="inline-block w-4 h-4 ml-1 text-gray-400" />;
	};

	return (
		<div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8 font-inter">
			<div className="max-w-7xl w-full bg-white shadow-lg rounded-xl p-6 sm:p-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
					Panou de Administrare Nexar
				</h1>

				{!isAdmin ? (
					<div className="text-center p-8 bg-red-50 rounded-lg shadow-sm">
						<AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
						<h2 className="mt-4 text-xl font-semibold text-red-800">
							Acces Restricționat
						</h2>
						<p className="mt-2 text-red-700">
							Nu aveți permisiunile necesare pentru a accesa această pagină. Vă
							rugăm să vă asigurați că sunteți logat ca administrator.
						</p>
					</div>
				) : (
					<div className="flex flex-col lg:flex-row gap-6">
						{/* Sidebar de Navigare */}
						<div className="w-full lg:w-1/4 bg-gray-50 rounded-lg p-4 shadow-sm">
							<h2 className="text-lg font-semibold text-gray-800 mb-4">
								Navigare
							</h2>
							<ul>
								<li className="mb-2">
									<button
										onClick={() => setActiveTab("pending")}
										className={`w-full text-left flex items-center p-3 rounded-md transition-colors ${
											activeTab === "pending"
												? "bg-blue-500 text-white shadow-md"
												: "text-gray-700 hover:bg-gray-200"
										}`}
									>
										<Package className="h-5 w-5 mr-3" /> Anunțuri în Așteptare
									</button>
								</li>
								<li className="mb-2">
									<button
										onClick={() => setActiveTab("listings")}
										className={`w-full text-left flex items-center p-3 rounded-md transition-colors ${
											activeTab === "listings"
												? "bg-blue-500 text-white shadow-md"
												: "text-gray-700 hover:bg-gray-200"
										}`}
									>
										<Package className="h-5 w-5 mr-3" /> Toate Anunțurile
									</button>
								</li>
								<li className="mb-2">
									<button
										onClick={() => setActiveTab("users")}
										className={`w-full text-left flex items-center p-3 rounded-md transition-colors ${
											activeTab === "users"
												? "bg-blue-500 text-white shadow-md"
												: "text-gray-700 hover:bg-gray-200"
										}`}
									>
										<Users className="h-5 w-5 mr-3" /> Utilizatori
									</button>
								</li>
								<li className="mb-2">
									<button
										onClick={() => setActiveTab("settings")}
										className={`w-full text-left flex items-center p-3 rounded-md transition-colors ${
											activeTab === "settings"
												? "bg-blue-500 text-white shadow-md"
												: "text-gray-700 hover:bg-gray-200"
										}`}
									>
										<Settings className="h-5 w-5 mr-3" /> Setări (în curând)
									</button>
								</li>
							</ul>
						</div>

						{/* Conținutul Principal */}
						<div className="w-full lg:w-3/4 bg-gray-50 rounded-lg p-4 shadow-sm">
							{isLoading && (
								<div className="flex items-center justify-center p-8">
									<RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
									<span className="ml-3 text-lg text-gray-700">
										Se încarcă...
									</span>
								</div>
							)}

							{error && (
								<div
									className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
									role="alert"
								>
									<p className="font-bold">Eroare:</p>
									<p>{error}</p>
								</div>
							)}

							{/* Tab Anunțuri în Așteptare */}
							{activeTab === "pending" && !isLoading && !error && (
								<div>
									<h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
										<Package className="h-6 w-6 mr-2" /> Anunțuri în Așteptare
									</h2>
									<div className="mb-4 flex flex-col sm:flex-row gap-4">
										<div className="relative w-full sm:w-1/2">
											<input
												type="text"
												placeholder="Căutați după titlu..."
												className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
											/>
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
										</div>
										<div className="relative w-full sm:w-1/4">
											<select
												className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
												value={sellerTypeFilter}
												onChange={(e) => setSellerTypeFilter(e.target.value)}
											>
												<option value="all">Toate Tipurile Vânzătorului</option>
												<option value="individual">Individual</option>
												<option value="dealer">Dealer</option>
											</select>
											<User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
										</div>
									</div>

									{filteredPendingListings.length === 0 ? (
										<div className="bg-white rounded-lg shadow p-8 text-center">
											<Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
											<h3 className="text-lg font-semibold text-gray-900 mb-2">
												Nu există anunțuri în așteptare
											</h3>
											<p className="text-gray-600">
												Toate anunțurile au fost procesate. Reveniți mai târziu pentru noi anunțuri.
											</p>
										</div>
									) : (
										<div className="overflow-x-auto rounded-lg shadow border border-gray-200">
											<table className="min-w-full divide-y divide-gray-200">
												<thead className="bg-gray-100">
													<tr>
														<th
															className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
															onClick={() => handleSort("title")}
														>
															Titlu {getSortIcon("title")}
														</th>
														<th
															className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
															onClick={() => handleSort("seller_name")}
														>
															Vânzător {getSortIcon("seller_name")}
														</th>
														<th
															className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
															onClick={() => handleSort("price")}
														>
															Preț {getSortIcon("price")}
														</th>
														<th
															className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
															onClick={() => handleSort("created_at")}
														>
															Data {getSortIcon("created_at")}
														</th>
														<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
															Acțiuni
														</th>
													</tr>
												</thead>
												<tbody className="bg-white divide-y divide-gray-200">
													{filteredPendingListings.map((listing) => (
														<tr key={listing.id} className="hover:bg-gray-50">
															<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
																<div>
																	<div>{listing.title}</div>
																	<div className="text-xs text-gray-500">
																		{listing.brand} {listing.model}
																	</div>
																</div>
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																{listing.profiles?.name ||
																	listing.seller_name}{" "}
																(
																{listing.profiles?.seller_type ||
																	listing.seller_type}
																)
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																{new Intl.NumberFormat("ro-RO", {
																	style: "currency",
																	currency: "EUR",
																}).format(listing.price)}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																{new Date(listing.created_at).toLocaleDateString('ro-RO')}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
																<div className="flex items-center space-x-3">
																	<button
																		onClick={() =>
																			navigate(`/anunt/${listing.id}`)
																		}
																		className="text-blue-600 hover:text-blue-800 transition-colors"
																		title="Vezi anunțul"
																	>
																		<Eye className="h-5 w-5" />
																	</button>
																	<button
																		onClick={() =>
																			navigate(`/editeaza-anunt/${listing.id}`)
																		}
																		className="text-indigo-600 hover:text-indigo-800 transition-colors"
																		title="Editează anunțul"
																	>
																		<Edit className="h-5 w-5" />
																	</button>
																	<button
																		onClick={() =>
																			handleApproveRejectListing(
																				listing.id,
																				'approve'
																			)
																		}
																		disabled={isProcessing[listing.id]}
																		className="p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-100 text-green-600 hover:bg-green-200"
																		title="Aprobă anunțul"
																	>
																		{isProcessing[listing.id] ? (
																			<div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
																		) : (
																			<CheckCircle className="h-5 w-5" />
																		)}
																	</button>
																	<button
																		onClick={() =>
																			handleApproveRejectListing(
																				listing.id,
																				'reject'
																			)
																		}
																		disabled={isProcessing[listing.id]}
																		className="p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-100 text-red-600 hover:bg-red-200"
																		title="Respinge anunțul"
																	>
																		{isProcessing[listing.id] ? (
																			<div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
																		) : (
																			<XCircle className="h-5 w-5" />
																		)}
																	</button>
																	<button
																		onClick={() =>
																			handleDeleteListing(listing.id)
																		}
																		disabled={isProcessing[listing.id]}
																		className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
																		title="Șterge anunțul"
																	>
																		{isProcessing[listing.id] ? (
																			<div className="h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
																		) : (
																			<Trash2 className="h-5 w-5" />
																		)}
																	</button>
																</div>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							)}

							{/* Tab Toate Anunțurile */}
							{activeTab === "listings" && !isLoading && !error && (
								<div>
									<h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
										<Package className="h-6 w-6 mr-2" /> Toate Anunțurile
									</h2>
									<div className="mb-4 flex flex-col sm:flex-row gap-4">
										<div className="relative w-full sm:w-1/2">
											<input
												type="text"
												placeholder="Căutați după titlu..."
												className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
											/>
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
										</div>
										<div className="relative w-full sm:w-1/4">
											<select
												className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
												value={statusFilter}
												onChange={(e) => setStatusFilter(e.target.value)}
											>
												<option value="all">Toate Statusurile</option>
												<option value="active">Active</option>
												<option value="inactive">Inactive</option>
												<option value="pending">În așteptare</option>
												<option value="rejected">Respinse</option>
											</select>
											<Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
										</div>
										<div className="relative w-full sm:w-1/4">
											<select
												className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
												value={sellerTypeFilter}
												onChange={(e) => setSellerTypeFilter(e.target.value)}
											>
												<option value="all">Toate Tipurile Vânzătorului</option>
												<option value="individual">Individual</option>
												<option value="dealer">Dealer</option>
											</select>
											<User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
										</div>
									</div>

									<div className="overflow-x-auto rounded-lg shadow border border-gray-200">
										<table className="min-w-full divide-y divide-gray-200">
											<thead className="bg-gray-100">
												<tr>
													<th
														className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
														onClick={() => handleSort("title")}
													>
														Titlu {getSortIcon("title")}
													</th>
													<th
														className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
														onClick={() => handleSort("seller_name")}
													>
														Vânzător {getSortIcon("seller_name")}
													</th>
													<th
														className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
														onClick={() => handleSort("price")}
													>
														Preț {getSortIcon("price")}
													</th>
													<th
														className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
														onClick={() => handleSort("status")}
													>
														Status {getSortIcon("status")}
													</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
														Acțiuni
													</th>
												</tr>
											</thead>
											<tbody className="bg-white divide-y divide-gray-200">
												{filteredListings.length === 0 ? (
													<tr>
														<td
															colSpan={5}
															className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
														>
															Nu s-au găsit anunțuri.
														</td>
													</tr>
												) : (
													filteredListings.map((listing) => (
														<tr key={listing.id} className="hover:bg-gray-50">
															<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
																<div>
																	<div>{listing.title}</div>
																	<div className="text-xs text-gray-500">
																		{listing.brand} {listing.model}
																	</div>
																</div>
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																{listing.profiles?.name ||
																	listing.seller_name}{" "}
																(
																{listing.profiles?.seller_type ||
																	listing.seller_type}
																)
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																{new Intl.NumberFormat("ro-RO", {
																	style: "currency",
																	currency: "EUR",
																}).format(listing.price)}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm">
																<span
																	className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
																		listing.status === "active"
																			? "bg-green-100 text-green-800"
																			: listing.status === "pending"
																			? "bg-yellow-100 text-yellow-800"
																			: listing.status === "rejected"
																			? "bg-red-100 text-red-800"
																			: "bg-gray-100 text-gray-800"
																	}`}
																>
																	{listing.status === "active" ? "Activ" : 
																	 listing.status === "pending" ? "În așteptare" : 
																	 listing.status === "rejected" ? "Respins" : 
																	 listing.status}
																</span>
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
																<div className="flex items-center space-x-3">
																	<button
																		onClick={() =>
																			navigate(`/anunt/${listing.id}`)
																		}
																		className="text-blue-600 hover:text-blue-800 transition-colors"
																		title="Vezi anunțul"
																	>
																		<Eye className="h-5 w-5" />
																	</button>
																	<button
																		onClick={() =>
																			navigate(`/editeaza-anunt/${listing.id}`)
																		}
																		className="text-indigo-600 hover:text-indigo-800 transition-colors"
																		title="Editează anunțul"
																	>
																		<Edit className="h-5 w-5" />
																	</button>
																	{listing.status !== "active" && (
																		<button
																			onClick={() =>
																				handleApproveRejectListing(
																					listing.id,
																					'approve'
																				)
																			}
																			disabled={isProcessing[listing.id]}
																			className="p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-100 text-green-600 hover:bg-green-200"
																			title="Aprobă anunțul"
																		>
																			{isProcessing[listing.id] ? (
																				<div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
																			) : (
																				<CheckCircle className="h-5 w-5" />
																			)}
																		</button>
																	)}
																	{listing.status !== "rejected" && (
																		<button
																			onClick={() =>
																				handleApproveRejectListing(
																					listing.id,
																					'reject'
																				)
																			}
																			disabled={isProcessing[listing.id]}
																			className="p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-100 text-red-600 hover:bg-red-200"
																			title="Respinge anunțul"
																		>
																			{isProcessing[listing.id] ? (
																				<div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
																			) : (
																				<XCircle className="h-5 w-5" />
																			)}
																		</button>
																	)}
																	<button
																		onClick={() =>
																			handleDeleteListing(listing.id)
																		}
																		disabled={isProcessing[listing.id]}
																		className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
																		title="Șterge anunțul"
																	>
																		{isProcessing[listing.id] ? (
																			<div className="h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
																		) : (
																			<Trash2 className="h-5 w-5" />
																		)}
																	</button>
																</div>
															</td>
														</tr>
													))
												)}
											</tbody>
										</table>
									</div>
								</div>
							)}

							{/* Tab Utilizatori */}
							{activeTab === "users" && !isLoading && !error && (
								<div>
									<h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
										<Users className="h-6 w-6 mr-2" /> Gestionare Utilizatori
									</h2>
									<div className="mb-4">
										<div className="relative w-full">
											<input
												type="text"
												placeholder="Căutați după email sau nume..."
												className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
											/>
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
										</div>
									</div>

									<div className="overflow-x-auto rounded-lg shadow border border-gray-200">
										<table className="min-w-full divide-y divide-gray-200">
											<thead className="bg-gray-100">
												<tr>
													<th
														className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
														onClick={() => handleSort("email")}
													>
														Email {getSortIcon("email")}
													</th>
													<th
														className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
														onClick={() => handleSort("name")}
													>
														Nume {getSortIcon("name")}
													</th>
													<th
														className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
														onClick={() => handleSort("seller_type")}
													>
														Tip Vânzător {getSortIcon("seller_type")}
													</th>
													<th
														className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
														onClick={() => handleSort("created_at")}
													>
														Înregistrat {getSortIcon("created_at")}
													</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
														Admin
													</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
														Acțiuni
													</th>
												</tr>
											</thead>
											<tbody className="bg-white divide-y divide-gray-200">
												{filteredUsers.length === 0 ? (
													<tr>
														<td
															colSpan={6}
															className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
														>
															Nu s-au găsit utilizatori.
														</td>
													</tr>
												) : (
													filteredUsers.map((user) => (
														<tr key={user.user_id} className="hover:bg-gray-50">
															<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
																{user.email}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																{user.name}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																{user.seller_type}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																{new Date(user.created_at).toLocaleDateString()}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm">
																{user.is_admin ? (
																	<Shield
																		className="h-5 w-5 text-blue-600"
																		title="Administrator"
																	/>
																) : (
																	<Shield
																		className="h-5 w-5 text-gray-400"
																		title="Utilizator normal"
																	/>
																)}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
																<div className="flex items-center space-x-3">
																	<button
																		onClick={() =>
																			handleDeleteUser(user.user_id)
																		}
																		disabled={isProcessing[user.user_id]}
																		className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
																		title="Șterge utilizatorul"
																	>
																		{isProcessing[user.user_id] ? (
																			<div className="h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
																		) : (
																			<Trash2 className="h-5 w-5" />
																		)}
																	</button>
																</div>
															</td>
														</tr>
													))
												)}
											</tbody>
										</table>
									</div>
								</div>
							)}

							{/* Tab Setări */}
							{activeTab === "settings" && !isLoading && !error && (
								<div className="p-6 text-center">
									<Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										Setări în dezvoltare
									</h3>
									<p className="text-gray-600">
										Această secțiune va fi disponibilă în curând.
									</p>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default AdminPage;