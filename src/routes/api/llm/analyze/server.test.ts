import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the workflow and tracing functions
vi.mock('../../../../lib/server/llm/langfuseIntegration', () => ({
	invokeWithTracing: vi.fn()
}));

vi.mock('../../../../lib/server/llm/costTracking/balanceService', () => ({
	BalanceService: vi.fn(() => ({
		hasSufficientBalance: vi.fn().mockResolvedValue(true)
	}))
}));

vi.mock('../../../../lib/server/database/supabase', () => ({
	createRepositories: vi.fn(() => ({
		ideas: {
			create: vi.fn().mockResolvedValue({
				id: 'test-idea-id',
				userId: 'test-user-id',
				title: 'Test Analysis',
				text: 'Test proposal',
				summary: 'Test summary',
				published: false
			})
		},
		userBalances: {},
		balanceTransactions: {}
	}))
}));

import { invokeWithTracing } from '../../../../lib/server/llm/langfuseIntegration';

describe('POST /api/llm/analyze', () => {
	const mockRequest = (body: any) =>
		({
			json: () => Promise.resolve(body)
		}) as Request;

	const mockLocals = {
		user: { id: 'test-user-id' },
		supabase: {
			from: vi.fn(() => ({
				insert: vi.fn(() => ({
					select: vi.fn().mockResolvedValue({
						data: [
							{
								id: 'test-statement-id-1',
								idea_id: 'test-idea-id',
								text: 'Statement 1',
								calculated_impact_score: '0.75'
							}
						],
						error: null
					})
				}))
			}))
		}
	};

	const mockRequestEvent: RequestEvent = {
		request: mockRequest({ proposal: 'Test proposal' }),
		locals: mockLocals
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should successfully analyze a proposal and store results', async () => {
		// Mock the workflow result
		const mockWorkflowResult = {
			extractedStatements: [
				'Reduce public transport ticket costs to zero',
				'Increase public transport usage by removing financial barrier',
				'Reduce traffic congestion on motorways and streets',
				'Improve transportation efficiency by utilizing more public transport seats',
				'Lower CO2 emissions by encouraging public transit over private vehicle use',
				'Optimize public transport routes to minimize operational costs',
				'Create more accessible and attractive transportation options for city residents'
			],
			downstreamImpacts: [
				'Reduced fuel consumption and lower carbon emissions',
				'Improved air quality in urban and suburban areas',
				'Decreased transportation costs for businesses and individuals',
				'Increased productivity due to shorter commute times',
				'Reduced wear and tear on road infrastructure',
				'Lower stress levels and improved mental health for commuters',
				'Potential economic boost from more efficient logistics and transportation',
				'Increased attractiveness of urban areas for residential and commercial development',
				'Reduced demand for vehicle maintenance and repair services',
				'Reduced personal vehicle ownership leading to decreased urban parking infrastructure demands',
				'Lower carbon emissions from more efficient public and shared transportation systems',
				'Increased mobility for low-income populations, potentially improving job accessibility',
				'Potential economic stimulus for local transportation service and infrastructure industries',
				'Reduced traffic congestion, leading to improved urban air quality',
				'Decreased healthcare costs from increased population physical activity and reduced transportation-related stress',
				'Urban real estate value shifts near new transportation corridors and hub locations',
				'Potential job market transformation in automotive and transportation-related sectors',
				'Enhanced social connectivity through more integrated urban transportation networks',
				'Reduced private vehicle usage leading to lower urban carbon emissions',
				'Decreased demand for parking infrastructure in city centers',
				'Lower municipal road maintenance costs due to reduced traffic congestion',
				'Potential job shifts in automotive and transportation-related industries',
				'Improved air quality with reduced individual car emissions',
				'Economic savings for commuters through lower transportation expenses',
				'Increased social connectivity and interaction in shared public transport spaces',
				'Reduced urban land use requirements for personal vehicle infrastructure',
				'Potential economic stimulation of public transit infrastructure and related services',
				'Reduced urban air pollution from fewer private vehicles',
				'Decreased demand for petroleum and fossil fuel extraction',
				'Lower municipal infrastructure maintenance costs for road repairs',
				'Potential job shifts in automotive manufacturing and petroleum industries',
				'Improved public health outcomes from reduced particulate matter exposure',
				'Economic pressure on automobile dealerships and related service industries',
				'Increased urban density and potential redesign of city transportation infrastructure',
				'Reduced greenhouse gas emissions contributing to climate change mitigation',
				'Enhanced social equity through more accessible transportation options',
				'Reduced municipal transportation budget expenditures',
				'Potential job restructuring or workforce reduction for transit operators',
				'Lower carbon emissions from more efficient route planning',
				'Decreased fuel consumption and related environmental impact',
				'Potential reduction in service frequency on less-traveled routes',
				'Improved urban mobility for commuters with more streamlined connections',
				'Economic ripple effects for local businesses near optimized transit corridors',
				'Increased pressure on alternative transportation modes like ride-sharing',
				'Potential socioeconomic disparities if route optimization disadvantages low-income neighborhoods',
				'Reduced personal vehicle ownership, leading to lower carbon emissions',
				'Decreased urban parking infrastructure demand',
				'Increased job opportunities in public transportation sector',
				'Improved air quality in metropolitan areas',
				'Enhanced mobility for low-income populations',
				'Potential reduction in traffic congestion',
				'Lower municipal infrastructure maintenance costs for road repairs',
				'Economic stimulation through increased transit system investments',
				'Reduced household transportation expenses for citizens',
				'Increased public transport ridership and reduced personal vehicle usage',
				'Reduced carbon emissions from transportation sector',
				'Potential municipal budget strain from lost ticket revenue',
				'Increased demand for public transit infrastructure expansion',
				'Job creation in public transportation maintenance and operations',
				'Potential reduction in traffic congestion in urban areas',
				'Improved mobility for low-income populations',
				'Potential decrease in ride-sharing and taxi services market share',
				'Higher tax burden to subsidize free public transportation'
			],
			groupedCategories: {
				Environmental: [
					'Reduced carbon emissions from transportation sector',
					'Reduced personal vehicle usage leading to lower urban carbon emissions',
					'Reduced urban air pollution from fewer private vehicles',
					'Decreased demand for petroleum and fossil fuel extraction',
					'Reduced greenhouse gas emissions contributing to climate change mitigation',
					'Decreased fuel consumption and related environmental impact',
					'Lower carbon emissions from more efficient public and shared transportation systems',
					'Improved air quality in metropolitan areas',
					'Improved air quality in urban and suburban areas',
					'Improved air quality with reduced individual car emissions'
				],
				Economic: [
					'Potential municipal budget strain from lost ticket revenue',
					'Higher tax burden to subsidize free public transportation',
					'Economic stimulation through increased transit system investments',
					'Decreased transportation costs for businesses and individuals',
					'Potential economic boost from more efficient logistics and transportation',
					'Economic savings for commuters through lower transportation expenses',
					'Potential economic stimulation of public transit infrastructure and related services',
					'Economic pressure on automobile dealerships and related service industries',
					'Reduced municipal transportation budget expenditures',
					'Economic ripple effects for local businesses near optimized transit corridors',
					'Potential economic stimulus for local transportation service and infrastructure industries'
				],
				'Labor & Social': [
					'Job creation in public transportation maintenance and operations',
					'Increased job opportunities in public transportation sector',
					'Potential job shifts in automotive and transportation-related industries',
					'Enhanced social equity through more accessible transportation options',
					'Increased social connectivity and interaction in shared public transport spaces',
					'Potential job restructuring or workforce reduction for transit operators',
					'Potential job market transformation in automotive and transportation-related sectors',
					'Enhanced social connectivity through more integrated urban transportation networks'
				],
				'Resource Impact': [
					'Increased demand for public transit infrastructure expansion',
					'Decreased urban parking infrastructure demand',
					'Reduced urban land use requirements for personal vehicle infrastructure',
					'Reduced wear and tear on road infrastructure',
					'Lower municipal infrastructure maintenance costs for road repairs',
					'Reduced demand for vehicle maintenance and repair services',
					'Decreased demand for parking infrastructure in city centers',
					'Lower municipal road maintenance costs due to reduced traffic congestion'
				],
				'Mobility & Accessibility': [
					'Improved mobility for low-income populations',
					'Potential reduction in traffic congestion in urban areas',
					'Increased public transport ridership and reduced personal vehicle usage',
					'Reduced personal vehicle ownership, leading to lower carbon emissions',
					'Enhanced mobility for low-income populations',
					'Potential reduction in traffic congestion',
					'Increased productivity due to shorter commute times',
					'Improved urban mobility for commuters with more streamlined connections',
					'Increased mobility for low-income populations, potentially improving job accessibility'
				],
				'Health & Well-being': [
					'Lower stress levels and improved mental health for commuters',
					'Improved public health outcomes from reduced particulate matter exposure',
					'Decreased healthcare costs from increased population physical activity and reduced transportation-related stress'
				],
				'Urban Development': [
					'Potential reduction in ride-sharing and taxi services market share',
					'Increased attractiveness of urban areas for residential and commercial development',
					'Urban real estate value shifts near new transportation corridors and hub locations',
					'Increased urban density and potential redesign of city transportation infrastructure',
					'Potential socioeconomic disparities if route optimization disadvantages low-income neighborhoods'
				]
			},
			researchFindings: {
				Environmental:
					"I'll help you find concrete, numerical data to support these environmental impact statements. Let me search for specific data on transportation emissions and the environmental benefits of reduced vehicle usage.\n" +
					'\n' +
					'## Carbon Emissions from Transportation\n' +
					'\n' +
					'**Transportation Sector Emissions:**\n' +
					'- Transportation accounts for approximately **29% of total U.S. greenhouse gas emissions** (EPA, 2021)\n' +
					'- Light-duty vehicles (cars and light trucks) represent about **58% of transportation emissions**\n' +
					'- The average passenger vehicle emits about **4.6 metric tons of CO2 per year**\n' +
					'- Each gallon of gasoline burned creates about **19.6 pounds of CO2**\n' +
					'\n' +
					'## Impact of Reduced Vehicle Usage\n' +
					'\n' +
					'**Public Transportation Benefits:**\n' +
					'- Public transportation saves approximately **4.2 billion gallons of gasoline annually** in the U.S.\n' +
					'- This translates to **37 million metric tons of CO2 emissions avoided** per year\n' +
					'- A single person switching from car to public transit can reduce CO2 emissions by **4,800 pounds per year**\n' +
					'- Bus rapid transit systems can reduce CO2 emissions by **40-50%** compared to private vehicles\n' +
					'\n' +
					'**Shared Transportation Impact:**\n' +
					'- Car-sharing services can replace **9-13 private vehicles** per shared car\n' +
					'- Each car-sharing vehicle can reduce CO2 emissions by **0.58 tons per year**\n' +
					'- Ride-sharing can reduce vehicle miles traveled by **2.6%** in urban areas when replacing private car trips\n' +
					'\n' +
					'## Air Quality Improvements\n' +
					'\n' +
					'**Urban Air Pollution Reduction:**\n' +
					'- A **10% reduction in vehicle traffic** can decrease:\n' +
					'  - Nitrogen oxides (NOx) by **8-12%**\n' +
					'  - Particulate matter (PM2.5) by **6-10%**\n' +
					'  - Carbon monoxide by **10-15%**\n' +
					'\n' +
					'**Health-Related Air Quality Data:**\n' +
					'- Vehicle emissions contribute to approximately **53,000 premature deaths annually** in the U.S.\n' +
					'- Cities with robust public transit systems show **20-30% lower** concentrations of harmful pollutants\n' +
					'- Areas within 500 meters of major highways have **30-50% higher** pollution levels\n' +
					'\n' +
					'## Fuel Consumption and Petroleum Demand\n' +
					'\n' +
					'**Fuel Efficiency Comparisons:**\n' +
					'- Public buses achieve approximately **4.3 miles per gallon** but carry **40+ passengers** (equivalent to **172 passenger-miles per gallon**)\n' +
					'- Rail transit achieves approximately **2,750 BTU per passenger-mile** compared to **3,500 BTU per passenger-mile** for private vehicles\n' +
					'- A full bus can replace **40 cars**, reducing fuel consumption by **85%**\n' +
					'\n' +
					'**Petroleum Reduction:**\n' +
					'- If 10% of Americans used public transportation regularly, U.S. petroleum consumption would decrease by **40%**\n' +
					'- Each year of public transit use by one person saves approximately **220 gallons of gasoline**\n' +
					'\n' +
					'## Metropolitan Air Quality Improvements\n' +
					'\n' +
					'**Specific City Data:**\n' +
					'- **New York City:** Public transportation prevents **17 million tons of CO2** emissions annually\n' +
					'- **San Francisco:** Transit systems reduce regional CO2 emissions by **40%**\n' +
					'- **Washington D.C.:** Metro system eliminates **1.2 million tons of CO2** per year\n' +
					'\n' +
					'**Pollution Concentration Reductions:**\n' +
					'- Cities with comprehensive public transit show:\n' +
					'  - **25% lower ozone levels**\n' +
					'  - **20% reduction in PM2.5 concentrations**\n' +
					'  - **30% decrease in nitrogen dioxide levels**\n' +
					'\n' +
					'## Climate Change Mitigation Potential\n' +
					'\n' +
					'**Long-term Impact Projections:**\n' +
					'- Widespread adoption of public and shared transportation could reduce transportation emissions by **40-50% by 2050**\n' +
					'- Modal shift to public transit could prevent **79 billion tons of CO2** globally by 2050\n' +
					'- Investment in public transportation infrastructure could reduce global emissions by **1.8 gigatons of CO2** annually\n' +
					'\n' +
					'These numerical data points provide concrete evidence supporting the environmental impact statements, demonstrating measurable benefits in carbon emission reduction, air quality improvement, and climate change mitigation through reduced private vehicle usage and increased adoption of public and shared transportation systems.',
				Economic:
					"I'll search for concrete numerical data related to the economic impacts of free public transportation. Let me break this down into key areas and search systematically.\n" +
					'\n' +
					'**Search 1: Municipal budget impacts and ticket revenue data**\n' +
					'\n' +
					'<search>free public transportation municipal budget impact ticket revenue loss statistics</search>\n' +
					'\n' +
					'**Search 2: Tax burden and subsidization costs**\n' +
					'\n' +
					'<search>free public transit tax burden increase cost subsidies per capita statistics</search>\n' +
					'\n' +
					'**Search 3: Transportation cost savings for individuals and businesses**\n' +
					'\n' +
					'<search>free public transportation cost savings commuters businesses numerical data statistics</search>\n' +
					'\n' +
					'**Search 4: Economic stimulus from transit investments**\n' +
					'\n' +
					'<search>public transportation infrastructure investment economic multiplier effect statistics</search>\n' +
					'\n' +
					'**Search 5: Impact on automobile industry**\n' +
					'\n' +
					'<search>free public transit impact car sales automobile dealership revenue statistics</search>\n' +
					'\n' +
					'**Search 6: Local business economic effects near transit**\n' +
					'\n' +
					'<search>public transportation corridors local business revenue impact economic data</search>\n' +
					'\n' +
					'**Search 7: Municipal transportation budget changes**\n' +
					'\n' +
					'<search>free public transportation municipal budget savings operational costs data</search>\n' +
					'\n' +
					'**Search 8: Case studies with specific numbers**\n' +
					'\n' +
					'<search>"free public transportation" case study economic impact Luxembourg Estonia numerical results</search>\n' +
					'\n' +
					"Based on these searches, I'll compile concrete numerical data for each economic impact statement, focusing on real-world examples, cost-benefit analyses, and quantified economic effects from cities and regions that have implemented free public transportation policies.",
				'Labor & Social':
					"I'll search for concrete numerical data related to the labor and social impacts of public transportation. Let me break this down into specific searches.\n" +
					'\n' +
					'**Search 1: Job Creation in Public Transportation**\n' +
					'\n' +
					'```search\n' +
					'public transportation job creation statistics employment numbers maintenance operations\n' +
					'```\n' +
					'\n' +
					'**Search 2: Employment Data in Transit Sector**\n' +
					'\n' +
					'```search\n' +
					'public transit employment statistics jobs per mile rail bus system workforce data\n' +
					'```\n' +
					'\n' +
					'**Search 3: Job Market Transformation in Transportation**\n' +
					'\n' +
					'```search\n' +
					'transportation sector job shifts automotive industry employment changes public transit\n' +
					'```\n' +
					'\n' +
					'**Search 4: Social Equity and Accessibility Data**\n' +
					'\n' +
					'```search\n' +
					'public transportation social equity statistics accessibility low income communities data\n' +
					'```\n' +
					'\n' +
					'**Search 5: Transit Ridership and Social Connectivity**\n' +
					'\n' +
					'```search\n' +
					'public transportation ridership statistics social benefits community connectivity data\n' +
					'```\n' +
					'\n' +
					'**Search 6: Transit Operator Workforce Changes**\n' +
					'\n' +
					'```search\n' +
					'transit operator employment trends workforce reduction automation public transportation\n' +
					'```\n' +
					'\n' +
					'**Search 7: Economic Impact on Transportation Jobs**\n' +
					'\n' +
					'```search\n' +
					'public transportation economic impact jobs created per investment dollar statistics\n' +
					'```\n' +
					'\n' +
					'**Search 8: Urban Transportation Integration Benefits**\n' +
					'\n' +
					'```search\n' +
					'integrated urban transportation networks social benefits connectivity statistics data\n' +
					'```\n' +
					'\n' +
					'These searches should provide concrete numerical data on:\n' +
					'- Specific job creation numbers per transit project/investment\n' +
					'- Employment ratios in public vs private transportation\n' +
					'- Quantified social equity improvements\n' +
					'- Ridership and connectivity metrics\n' +
					'- Workforce transformation statistics\n' +
					'- Economic multiplier effects on employment\n' +
					'\n' +
					'Would you like me to proceed with these searches to gather the specific numerical data?',
				'Resource Impact':
					"I'll search for concrete numerical data related to each statement in the Resource Impact category. Let me conduct systematic searches to find specific metrics and statistics.\n" +
					'\n' +
					'## Search Results for Resource Impact Statements\n' +
					'\n' +
					'### 1. Public Transit Infrastructure Expansion Demand\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- Cities investing in transit see **$4.2 billion annually** in new transit infrastructure projects in the US\n' +
					'- Each new bus rapid transit line costs approximately **$10-25 million per mile**\n' +
					'- Light rail systems cost **$35-100 million per mile** to construct\n' +
					'- Transit ridership increases of **20-40%** typically follow major infrastructure investments\n' +
					'\n' +
					'### 2. Urban Parking Infrastructure Demand Reduction\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- Each parking space costs **$15,000-50,000** to construct (surface) and **$25,000-75,000** (structured)\n' +
					'- Cities with robust public transit see **15-30% reduction** in parking demand\n' +
					'- San Francisco reduced minimum parking requirements by **20-40%** in transit-rich areas\n' +
					'- Shared mobility reduces parking needs by **13 spaces per shared vehicle**\n' +
					'\n' +
					'### 3. Urban Land Use Requirements for Vehicle Infrastructure\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- Parking occupies **30-60%** of urban land area in typical US cities\n' +
					'- Each car requires approximately **8 parking spaces** throughout its lifecycle\n' +
					'- Transit-oriented development reduces land dedicated to parking by **25-50%**\n' +
					'- One bus can replace **30-40 private vehicles** during peak hours\n' +
					'\n' +
					'### 4. Road Infrastructure Wear and Tear Reduction\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- A single bus causes road wear equivalent to **9,600 cars** (based on axle weight)\n' +
					'- However, **40-60 passengers per bus** vs. 40-60 individual cars results in **net reduction**\n' +
					'- Road wear follows the "fourth power rule" - doubling axle weight increases wear **16-fold**\n' +
					'- Transit systems reduce overall vehicle miles traveled by **4.2 billion miles annually** in the US\n' +
					'\n' +
					'### 5. Municipal Infrastructure Maintenance Cost Reduction\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- Average road maintenance costs: **$2-8 per square yard annually**\n' +
					'- Cities with extensive transit save **$50-100 million annually** in road maintenance\n' +
					'- Each mile of road costs **$25,000-50,000 annually** to maintain\n' +
					'- Transit reduces road maintenance needs by **10-25%** on served corridors\n' +
					'\n' +
					'### 6. Vehicle Maintenance and Repair Services Demand\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- Average annual vehicle maintenance cost: **$1,200-1,500 per vehicle**\n' +
					'- Transit users reduce personal vehicle use by **20-40%**\n' +
					'- Each transit rider saves approximately **$300-600 annually** in vehicle maintenance\n' +
					'- Public transit reduces total vehicle maintenance market by **$2.3 billion annually** in the US\n' +
					'\n' +
					'### 7. City Center Parking Infrastructure Demand\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- Downtown parking construction costs: **$15,000-40,000 per space** (surface) to **$40,000-70,000** (garage)\n' +
					'- Cities with good transit see **25-45% reduction** in downtown parking demand\n' +
					'- Each transit line reduces downtown parking needs by **500-2,000 spaces**\n' +
					'- Parking revenue losses of **$1,000-3,000 per space annually** in high-transit areas\n' +
					'\n' +
					'### 8. Municipal Road Maintenance Cost Reduction from Reduced Congestion\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- Traffic congestion increases road maintenance costs by **15-30%**\n' +
					'- Stop-and-go traffic increases pavement wear by **40-60%**\n' +
					'- Transit systems reduce congestion-related road damage by **$10-25 million annually** per major city\n' +
					'- Each 10% reduction in traffic volume decreases road maintenance costs by **5-8%**\n' +
					'\n' +
					'## Summary of Quantified Impacts\n' +
					'\n' +
					'**Cost Savings:**\n' +
					'- Road maintenance: **$50-100 million annually** per major city\n' +
					'- Parking infrastructure avoided: **$15,000-75,000 per space**\n' +
					'- Vehicle maintenance reduction: **$2.3 billion annually** (US total)\n' +
					'\n' +
					'**Infrastructure Demand Changes:**\n' +
					'- Parking demand reduction: **15-45%** in transit-served areas\n' +
					'- Road wear reduction: **10-25%** on transit corridors\n' +
					'- Land use efficiency: **25-50%** reduction in parking land requirements\n' +
					'\n' +
					'**Investment Requirements:**\n' +
					'- Transit infrastructure: **$10-100 million per mile** depending on mode\n' +
					'- Annual transit infrastructure investment: **$4.2 billion** (US)\n' +
					'\n' +
					'These figures demonstrate significant resource reallocation from individual vehicle infrastructure to shared transit infrastructure, with substantial long-term cost savings despite upfront investment requirements.',
				'Mobility & Accessibility':
					"I'll help you find concrete, numerical data for the Mobility & Accessibility impact category. Let me search for specific statistics and studies related to these statements.\n" +
					'\n' +
					'## Search Results and Numerical Data\n' +
					'\n' +
					'### **Low-Income Population Mobility Improvements**\n' +
					'\n' +
					'**Public Transit Access Impact:**\n' +
					'- Studies show that every 10% increase in public transit accessibility correlates with a **15-20% increase** in job accessibility for low-income households\n' +
					'- Low-income households are **4.5 times more likely** to use public transportation than high-income households\n' +
					'- **68%** of public transit riders have household incomes below $50,000 annually\n' +
					'\n' +
					'**Ride-sharing and Mobility Services:**\n' +
					'- Shared mobility services have increased transportation options by **25-40%** in underserved communities\n' +
					'- **23%** of ride-sharing users report household incomes below $25,000\n' +
					"- Transit-oriented development increases low-income residents' job accessibility by **30-50%**\n" +
					'\n' +
					'### **Traffic Congestion Reduction**\n' +
					'\n' +
					'**Congestion Metrics:**\n' +
					'- Each bus can replace approximately **40 cars** during peak hours\n' +
					'- Bus Rapid Transit (BRT) systems reduce traffic congestion by **15-25%** on parallel corridors\n' +
					'- Comprehensive public transit systems can reduce urban traffic by **10-15%**\n' +
					'- Peak-hour congestion decreases by **8-12%** with every 10% increase in public transit ridership\n' +
					'\n' +
					'**Economic Impact:**\n' +
					'- Traffic congestion costs the average American **$1,400 annually** in lost time and fuel\n' +
					'- Cities with robust public transit save residents an average of **$10,000 per year** in transportation costs\n' +
					'\n' +
					'### **Public Transport Ridership and Vehicle Usage**\n' +
					'\n' +
					'**Ridership Statistics:**\n' +
					'- U.S. public transportation ridership: **9.9 billion trips annually** (pre-pandemic)\n' +
					'- Every $1 invested in public transportation generates **$4-5 in economic returns**\n' +
					'- **14 million times per weekday**, Americans board public transportation\n' +
					'\n' +
					'**Vehicle Usage Reduction:**\n' +
					'- Households with access to high-quality transit reduce car trips by **20-30%**\n' +
					'- Transit-oriented communities show **25-35%** lower vehicle miles traveled (VMT)\n' +
					'- Each person who switches to public transit reduces CO2 emissions by **4,800 pounds annually**\n' +
					'\n' +
					'### **Vehicle Ownership and Carbon Emissions**\n' +
					'\n' +
					'**Ownership Reduction:**\n' +
					'- Households near transit stations are **25%** less likely to own multiple vehicles\n' +
					'- Car-sharing programs reduce private vehicle ownership by **9-13 vehicles** per shared car\n' +
					'- Transit-accessible neighborhoods show **15-20%** lower household vehicle ownership rates\n' +
					'\n' +
					'**Carbon Emission Reductions:**\n' +
					'- Public transportation produces **95% less CO2** per passenger mile than private vehicles\n' +
					'- A single person switching from car to public transit can reduce CO2 emissions by **20 pounds per day**\n' +
					'- Public transportation saves **37 million metric tons** of CO2 annually in the U.S.\n' +
					'- Bus transit produces **33% fewer emissions** per passenger mile than private vehicles\n' +
					'\n' +
					'### **Productivity and Commute Time Improvements**\n' +
					'\n' +
					'**Commute Time Data:**\n' +
					'- Average American commute time: **27.6 minutes** one-way\n' +
					'- BRT systems reduce average commute times by **15-25%**\n' +
					'- High-frequency transit can reduce door-to-door travel times by **10-20%**\n' +
					'\n' +
					'**Productivity Gains:**\n' +
					'- Every minute reduced in commute time increases productivity by **$1,600 annually** per worker\n' +
					'- Transit users can be productive during **60-80%** of their commute time (reading, working on devices)\n' +
					'- Reduced commute stress increases workplace productivity by **12-15%**\n' +
					'\n' +
					'### **Job Accessibility Improvements**\n' +
					'\n' +
					'**Employment Access:**\n' +
					'- **60%** of low-income jobs are not accessible by public transit\n' +
					'- Improved transit connections increase job accessibility by **35-50%** for low-income populations\n' +
					'- Every additional mile of transit access increases employment opportunities by **7%**\n' +
					'- Workers with better transit access earn **6-8%** higher wages on average\n' +
					'\n' +
					'**Geographic Impact:**\n' +
					'- Transit improvements increase access to jobs within 90 minutes by **40-60%**\n' +
					'- **41%** of transit riders are commuting to work\n' +
					'- Low-income workers travel **25%** farther to work when transit options are limited\n' +
					'\n' +
					'### **Key Quantitative Benchmarks:**\n' +
					'\n' +
					'- **Traffic Reduction:** 10-25% decrease in congestion\n' +
					'- **Emission Reduction:** 95% less CO2 per passenger mile vs. private vehicles\n' +
					'- **Cost Savings:** $10,000 annual household transportation savings\n' +
					'- **Job Access:** 35-50% improvement for low-income populations\n' +
					'- **Vehicle Replacement:** 1 bus = 40 cars during peak hours\n' +
					'- **Productivity:** $1,600 annual gain per minute of commute time saved\n' +
					'\n' +
					'These numerical data points provide concrete evidence supporting the mobility and accessibility impact statements, with measurable benefits across economic, environmental, and social dimensions.',
				'Health & Well-being':
					"I'll help you find concrete, numerical data to support these health and well-being statements. Let me search for specific statistics and research findings.\n" +
					'\n' +
					'## Search Results for Health & Well-being Impact Data\n' +
					'\n' +
					'### 1. Lower stress levels and improved mental health for commuters\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- **Stress Reduction**: Studies show that switching from car commuting to active transportation (walking, cycling) or public transit can reduce cortisol levels by 15-25%\n' +
					'- **Mental Health Improvement**: A UK study found that people who switched from driving to walking or cycling for their commute showed improved psychological well-being scores by 0.17 points on a standardized scale\n' +
					'- **Transit vs. Driving**: Commuters using public transportation report 33% less stress compared to those driving in heavy traffic\n' +
					'- **Active Commuting Benefits**: Regular cyclists show 15% lower rates of depression and anxiety compared to car commuters\n' +
					'\n' +
					'### 2. Improved public health outcomes from reduced particulate matter exposure\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- **PM2.5 Reduction**: Each 10 μg/m³ decrease in PM2.5 concentration is associated with:\n' +
					'  - 6-8% reduction in cardiovascular mortality\n' +
					'  - 4-6% reduction in respiratory mortality\n' +
					'  - 1-3% reduction in all-cause mortality\n' +
					'- **Transportation Emissions**: Personal vehicles contribute 45-60% of urban PM2.5 emissions in major cities\n' +
					'- **Health Cost Savings**: Every 1 μg/m³ reduction in PM2.5 saves approximately $1,400-$2,100 per person annually in health costs\n' +
					'- **Asthma Reduction**: Areas with 20% reduction in traffic-related air pollution show 15-20% decrease in childhood asthma rates\n' +
					'\n' +
					'### 3. Decreased healthcare costs from increased physical activity and reduced transportation-related stress\n' +
					'\n' +
					'**Key Findings:**\n' +
					'- **Physical Activity Savings**: \n' +
					'  - Each person meeting WHO physical activity guidelines through active transportation saves $1,500-$2,500 annually in healthcare costs\n' +
					'  - Regular cycling reduces healthcare costs by $544 per person per year on average\n' +
					'- **Stress-Related Healthcare Costs**:\n' +
					'  - Transportation stress accounts for $300-$500 per person annually in stress-related healthcare expenses\n' +
					'  - Reduced commute stress can decrease cardiovascular disease treatment costs by 12-18%\n' +
					'- **Population-Level Savings**: Cities with comprehensive active transportation infrastructure see 8-15% reduction in per-capita healthcare expenditures\n' +
					'- **ROI on Infrastructure**: Every $1 invested in cycling infrastructure returns $3-$11 in healthcare cost savings over 20 years\n' +
					'\n' +
					'### Additional Supporting Data:\n' +
					'- **Air Quality Improvement**: 20% reduction in vehicle miles traveled correlates with 15% improvement in urban air quality indices\n' +
					'- **Physical Activity Increase**: Cities with protected bike lanes see 25-50% increase in active transportation usage\n' +
					'- **Mental Health Metrics**: Access to quality public transit reduces reported anxiety levels by 23% among regular users\n' +
					'\n' +
					'These numerical findings provide concrete evidence supporting the health and well-being benefits across all three statement categories, with measurable impacts on stress reduction, air quality improvement, and healthcare cost savings.',
				'Urban Development':
					"I'll search for concrete numerical data related to each statement in the Urban Development impact category.\n" +
					'\n' +
					'<search>\n' +
					'ride-sharing taxi market share reduction public transportation statistics data\n' +
					'</search>\n' +
					'\n' +
					'<search>\n' +
					'urban development residential commercial attractiveness public transit correlation statistics\n' +
					'</search>\n' +
					'\n' +
					'<search>\n' +
					'real estate property values transportation corridors transit hubs impact data\n' +
					'</search>\n' +
					'\n' +
					'<search>\n' +
					'urban density increase public transportation infrastructure redesign statistics\n' +
					'</search>\n' +
					'\n' +
					'<search>\n' +
					'transportation equity low-income neighborhoods route optimization disparities data\n' +
					'</search>\n' +
					'\n' +
					'<search>\n' +
					'transit oriented development property value increase percentage data\n' +
					'</search>\n' +
					'\n' +
					'<search>\n' +
					'public transportation impact ride-hailing services market share decline numbers\n' +
					'</search>\n' +
					'\n' +
					'<search>\n' +
					'urban real estate appreciation near subway metro stations percentage data\n' +
					'</search>\n' +
					'\n' +
					'<search>\n' +
					'city density changes public transit investment correlation statistics\n' +
					'</search>\n' +
					'\n' +
					'<search>\n' +
					'transportation accessibility low-income communities disparity metrics data\n' +
					'</search>\n' +
					'\n' +
					'Based on my research, here are the concrete numerical findings for each Urban Development impact statement:\n' +
					'\n' +
					'## **Potential reduction in ride-sharing and taxi services market share**\n' +
					'- **15-20% reduction** in ride-hailing trips in cities with expanded public transit\n' +
					'- **25% decrease** in taxi usage observed in cities after major transit improvements\n' +
					'- Studies show **$0.10 increase** in public transit fare correlates with **2-3% increase** in ride-sharing demand (inverse relationship)\n' +
					'\n' +
					'## **Increased attractiveness of urban areas for residential and commercial development**\n' +
					'- **$1 billion investment** in public transit generates approximately **$4.2 billion** in increased development\n' +
					'- **40-50% increase** in residential development applications within 0.5 miles of new transit stations\n' +
					'- **65% higher** commercial occupancy rates in transit-accessible areas compared to car-dependent zones\n' +
					'\n' +
					'## **Urban real estate value shifts near transportation corridors and hub locations**\n' +
					'- **10-35% premium** in residential property values within 0.25 miles of transit stations\n' +
					'- **20-25% increase** in commercial real estate values near major transit hubs\n' +
					'- **$1.5-2.3 million per mile** average property value increase along new transit corridors\n' +
					'- **15-20% appreciation** in property values within first 3 years of transit line opening\n' +
					'\n' +
					'## **Increased urban density and potential redesign of city transportation infrastructure**\n' +
					'- **30-40% increase** in population density within 0.5 miles of transit stations over 10 years\n' +
					'- **25% reduction** in parking space requirements in transit-oriented developments\n' +
					'- **$50-100 million per mile** typical cost for urban transit infrastructure redesign\n' +
					'- **2.5x higher** development density allowed in transit-oriented zoning districts\n' +
					'\n' +
					'## **Potential socioeconomic disparities if route optimization disadvantages low-income neighborhoods**\n' +
					'- **23% of low-income households** lack access to quality public transit vs. **7% of high-income households**\n' +
					'- **45 minutes longer** average commute times for low-income workers in poorly connected areas\n' +
					'- **$2,400 annual savings** in transportation costs for households with good transit access\n' +
					'- **15-20% employment opportunity gap** between well-connected and poorly connected low-income neighborhoods\n' +
					'\n' +
					'These numerical data points provide concrete metrics for measuring and tracking the urban development impacts of transportation system changes.'
			},
			evaluatedScores: {
				Environmental: 0.85,
				Economic: 0.75,
				'Labor & Social': 0.75,
				'Resource Impact': 0.85,
				'Mobility & Accessibility': 0.85,
				'Health & Well-being': 0.85,
				'Urban Development': 0.75
			},
			finalSummary: `## Free Public Transport in Auckland: A Comprehensive Impact Analysis

### Overview
The proposal to make public transport free in Auckland presents a transformative strategy with significant potential to improve urban mobility, environmental sustainability, and social equity.

### Key Impact Categories

1. **Environmental Impact** (Score: 0.85/1.0)
   - Potential to reduce CO2 emissions by up to **37 million metric tons annually**
   - Could decrease urban vehicle emissions by **40-50%**
   - Significant air quality improvements with **20-30% lower pollutant concentrations**

2. **Economic Considerations** (Score: 0.75/1.0)
   - Initial investment balanced by potential **$4-5 economic return per dollar spent**
   - Estimated **$10,000 annual savings per household** in transportation costs
   - Potential for infrastructure cost reductions and economic stimulus

3. **Social & Labor Implications** (Score: 0.75/1.0)
   - Increased job accessibility for low-income populations by **35-50%**
   - Potential to reduce transportation-related stress and improve mental well-being
   - Enhanced mobility for underserved communities

4. **Resource and Urban Development Impact** (Scores: 0.85/1.0 and 0.75/1.0)
   - Potential **25-45% reduction in downtown parking infrastructure**
   - **30-40% increase in population density near transit corridors**
   - Significant municipal resource reallocation from individual vehicle to shared transit infrastructure

### Recommendation
**PROCEED WITH IMPLEMENTATION**

The comprehensive data strongly supports the proposal, demonstrating substantial positive impacts across environmental, economic, social, and urban development dimensions. The potential benefits significantly outweigh the initial implementation costs.

### Next Steps
1. Develop detailed implementation strategy
2. Conduct pilot program in select corridors
3. Establish robust monitoring mechanisms for ongoing impact assessment`
		};

		vi.mocked(invokeWithTracing).mockResolvedValue(mockWorkflowResult);

		const response = await POST(mockRequestEvent);
		const responseData = await response.json();

		// Verify the response
		expect(response.status).toBe(200);
		expect(responseData.success).toBe(true);
		expect(responseData.analysis).toEqual(mockWorkflowResult);

		// Verify workflow was called with correct parameters
		expect(invokeWithTracing).toHaveBeenCalledWith(
			expect.anything(), // workflow
			expect.objectContaining({
				proposal: 'Test proposal',
				userId: 'test-user-id',
				extractedStatements: [],
				downstreamImpacts: [],
				groupedCategories: {},
				researchFindings: {},
				evaluatedScores: {},
				finalSummary: ''
			})
		);

		// Verify database operations
		expect(mockLocals.supabase.from).toHaveBeenCalledWith('statements');
	});

	it('should handle object proposals correctly', async () => {
		const objectProposal = {
			title: 'Test Proposal',
			description: 'Test description'
		};

		const mockRequestWithObject: RequestEvent = {
			request: mockRequest({ proposal: objectProposal }),
			locals: mockLocals
		} as any;

		const mockWorkflowResult = {
			extractedStatements: [],
			finalSummary: 'Test summary'
		};

		vi.mocked(invokeWithTracing).mockResolvedValue(mockWorkflowResult);

		const response = await POST(mockRequestWithObject);
		const responseData = await response.json();

		expect(response.status).toBe(200);
		expect(responseData.success).toBe(true);

		// Verify the proposal was converted to JSON string
		expect(invokeWithTracing).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				proposal: objectProposal
			})
		);
	});

	it('should return 401 if user is not authenticated', async () => {
		const unauthenticatedEvent: RequestEvent = {
			request: mockRequest({ proposal: 'Test' }),
			locals: { user: null, supabase: mockLocals.supabase }
		} as any;

		const response = await POST(unauthenticatedEvent);
		const responseData = await response.json();

		expect(response.status).toBe(401);
		expect(responseData.error).toBe('Authentication required');
	});

	it('should return 400 if proposal is missing', async () => {
		const requestWithoutProposal: RequestEvent = {
			request: mockRequest({}),
			locals: mockLocals
		} as any;

		const response = await POST(requestWithoutProposal);
		const responseData = await response.json();

		expect(response.status).toBe(400);
		expect(responseData.error).toBe('Proposal is required');
	});

	it('should handle insufficient balance', async () => {
		// Import and mock the BalanceService for this test
		const { BalanceService } = await import(
			'../../../../lib/server/llm/costTracking/balanceService'
		);
		const mockBalanceService = {
			hasSufficientBalance: vi.fn().mockResolvedValue(false)
		};
		vi.mocked(BalanceService).mockImplementation(() => mockBalanceService as any);

		const response = await POST(mockRequestEvent);
		const responseData = await response.json();

		expect(response.status).toBe(402);
		expect(responseData.error).toBe(
			'Insufficient balance. Please add credits to your account to continue.'
		);

		// Reset the mock
		vi.mocked(BalanceService).mockImplementation(
			() =>
				({
					hasSufficientBalance: vi.fn().mockResolvedValue(true)
				}) as any
		);
	});

	it('should handle workflow errors gracefully', async () => {
		vi.mocked(invokeWithTracing).mockRejectedValue(new Error('Workflow failed'));

		const response = await POST(mockRequestEvent);
		const responseData = await response.json();

		expect(response.status).toBe(500);
		expect(responseData.success).toBe(false);
		expect(responseData.error).toBe('Workflow failed');
	});
});
